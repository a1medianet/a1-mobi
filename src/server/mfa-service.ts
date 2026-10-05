import { Prisma } from "@prisma/client";
import { verifyPassword } from "@/core/auth/password";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  matchTotpCounter,
} from "@/core/auth/totp";
import { db } from "./db";
import { consumeSensitiveActionBudget } from "./attempt-budget";

export type AccountSecurityContext = {
  actorId: string;
  tenantId: string;
  branchId: string;
  sessionId?: string;
};

function credentialSnapshot(enabledAt: Date | null) {
  return { enabled: Boolean(enabledAt) };
}

async function audit(
  tx: Prisma.TransactionClient,
  ctx: AccountSecurityContext,
  input: {
    action: string;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
  },
) {
  await tx.auditEvent.create({
    data: {
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      actorId: ctx.actorId,
      action: input.action,
      entityType: "MfaCredential",
      entityId: ctx.actorId,
      before: input.before,
      after: input.after,
    },
  });
}

export async function mfaStatus(ctx: AccountSecurityContext) {
  const credential = await db.mfaCredential.findUnique({
    where: { userId: ctx.actorId },
    select: { id: true, enabledAt: true },
  });
  if (!credential) return { enabled: false, recoveryCodesRemaining: 0 };
  const recoveryCodesRemaining = await db.mfaRecoveryCode.count({
    where: { credentialId: credential.id, usedAt: null },
  });
  return { enabled: Boolean(credential.enabledAt), recoveryCodesRemaining };
}

export async function beginMfaSetup(
  ctx: AccountSecurityContext,
  currentPassword: string,
  issuer = "A1 Mobi",
) {
  await consumeSensitiveActionBudget("mfa-setup", [ctx.actorId], 5);

  const user = await db.user.findFirst({
    where: {
      id: ctx.actorId,
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      isActive: true,
    },
    include: { tenant: { select: { slug: true } } },
  });

  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const secret = generateTotpSecret();
  const recoveryCodes = generateRecoveryCodes();
  const recoveryCodeHashes = recoveryCodes.map(hashRecoveryCode);
  const secretCipher = encryptTotpSecret(secret);

  await db.$transaction(async tx => {
    const before = await tx.mfaCredential.findUnique({
      where: { userId: user.id },
      select: { id: true, enabledAt: true },
    });
    if (before?.enabledAt) throw new Error("MFA_ALREADY_ENABLED");

    const credential = await tx.mfaCredential.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        secretCipher,
        lastUsedTotpCounter: null,
      },
      update: {
        secretCipher,
        enabledAt: null,
        lastUsedTotpCounter: null,
        version: { increment: 1 },
      },
      select: { id: true },
    });

    await tx.mfaRecoveryCode.deleteMany({
      where: { credentialId: credential.id },
    });
    await tx.mfaRecoveryCode.createMany({
      data: recoveryCodeHashes.map(codeHash => ({
        credentialId: credential.id,
        codeHash,
      })),
    });

    await audit(tx, ctx, {
      action: "auth.mfa.setup",
      before: credentialSnapshot(before?.enabledAt ?? null),
      after: { enabled: false, recoveryCodesIssued: recoveryCodes.length },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  const label = encodeURIComponent(user.tenant.slug + ":" + user.email);
  const issuerEncoded = encodeURIComponent(issuer);
  const otpauthUri =
    `otpauth://totp/${issuerEncoded}:${label}?secret=${secret}&issuer=${issuerEncoded}&algorithm=SHA1&digits=6&period=30`;

  return { secret, otpauthUri, recoveryCodes };
}

export async function enableMfa(ctx: AccountSecurityContext, code: string) {
  await consumeSensitiveActionBudget("mfa-enable", [ctx.actorId], 5);

  await db.$transaction(async tx => {
    const credential = await tx.mfaCredential.findUnique({
      where: { userId: ctx.actorId },
    });
    if (!credential) throw new Error("MFA_SETUP_REQUIRED");
    if (credential.enabledAt) throw new Error("MFA_ALREADY_ENABLED");

    const counter = matchTotpCounter(
      decryptTotpSecret(credential.secretCipher),
      code,
    );
    if (counter === null) throw new Error("INVALID_MFA");

    const enabled = await tx.mfaCredential.updateMany({
      where: {
        id: credential.id,
        userId: ctx.actorId,
        enabledAt: null,
        version: credential.version,
      },
      data: {
        enabledAt: new Date(),
        lastUsedTotpCounter: counter,
        version: { increment: 1 },
      },
    });
    if (enabled.count !== 1) throw new Error("MFA_ALREADY_ENABLED");

    await tx.session.updateMany({
      where: {
        userId: ctx.actorId,
        revokedAt: null,
        ...(ctx.sessionId ? { id: { not: ctx.sessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });

    await audit(tx, ctx, {
      action: "auth.mfa.enable",
      before: credentialSnapshot(null),
      after: { enabled: true, otherSessionsRevoked: true },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function disableMfa(
  ctx: AccountSecurityContext,
  currentPassword: string,
  factor: string,
) {
  await consumeSensitiveActionBudget("mfa-disable", [ctx.actorId], 5);

  await db.$transaction(async tx => {
    const user = await tx.user.findFirst({
      where: {
        id: ctx.actorId,
        tenantId: ctx.tenantId,
        branchId: ctx.branchId,
        isActive: true,
      },
    });
    const credential = await tx.mfaCredential.findUnique({
      where: { userId: ctx.actorId },
    });

    if (!user || !credential?.enabledAt ||
      !(await verifyPassword(user.passwordHash, currentPassword))) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const counter = matchTotpCounter(
      decryptTotpSecret(credential.secretCipher),
      factor,
    );

    if (counter !== null) {
      if (credential.lastUsedTotpCounter !== null &&
        counter <= credential.lastUsedTotpCounter) {
        throw new Error("INVALID_MFA");
      }
    } else {
      const codeHash = hashRecoveryCode(factor);
      const recovery = await tx.mfaRecoveryCode.findUnique({
        where: {
          credentialId_codeHash: {
            credentialId: credential.id,
            codeHash,
          },
        },
        select: { id: true, usedAt: true },
      });
      if (!recovery || recovery.usedAt) throw new Error("INVALID_MFA");

      const consumed = await tx.mfaRecoveryCode.updateMany({
        where: { id: recovery.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) throw new Error("INVALID_MFA");
    }

    await tx.mfaCredential.delete({ where: { id: credential.id } });
    await tx.session.updateMany({
      where: { userId: ctx.actorId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await audit(tx, ctx, {
      action: "auth.mfa.disable",
      before: { enabled: true },
      after: { enabled: false },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export type SecondFactorResult = {
  method: "none" | "totp" | "recovery";
  recoveryCodesRemaining?: number;
};

export async function verifyUserSecondFactor(
  tx: Prisma.TransactionClient,
  userId: string,
  factor: string | undefined,
): Promise<SecondFactorResult> {
  const credential = await tx.mfaCredential.findUnique({
    where: { userId },
  });
  if (!credential?.enabledAt) return { method: "none" };
  if (!factor) throw new Error("MFA_REQUIRED");

  const counter = matchTotpCounter(
    decryptTotpSecret(credential.secretCipher),
    factor,
  );

  if (counter !== null) {
    const claimed = await tx.mfaCredential.updateMany({
      where: {
        id: credential.id,
        userId,
        enabledAt: { not: null },
        OR: [
          { lastUsedTotpCounter: null },
          { lastUsedTotpCounter: { lt: counter } },
        ],
      },
      data: {
        lastUsedTotpCounter: counter,
        version: { increment: 1 },
      },
    });
    if (claimed.count !== 1) throw new Error("INVALID_MFA");
    return { method: "totp" };
  }

  const codeHash = hashRecoveryCode(factor);
  const recovery = await tx.mfaRecoveryCode.findUnique({
    where: {
      credentialId_codeHash: {
        credentialId: credential.id,
        codeHash,
      },
    },
    select: { id: true, usedAt: true },
  });
  if (!recovery || recovery.usedAt) throw new Error("INVALID_MFA");

  const consumed = await tx.mfaRecoveryCode.updateMany({
    where: { id: recovery.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (consumed.count !== 1) throw new Error("INVALID_MFA");

  const recoveryCodesRemaining = await tx.mfaRecoveryCode.count({
    where: { credentialId: credential.id, usedAt: null },
  });

  return { method: "recovery", recoveryCodesRemaining };
}
