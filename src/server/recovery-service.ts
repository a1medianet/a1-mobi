import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { hashPassword } from "@/core/auth/password";
import { db } from "./db";
import {
  AttemptBudgetExceeded,
  authBudgetKey,
  consumeAuthBudget,
  purgeExpiredAuthAttempts,
} from "./attempt-budget";
import { structuredLog } from "./logger";

const RESET_TTL_MS = 30 * 60 * 1000;
const RESET_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const RECOVERY_ACCOUNT_LIMIT = 3;
const RECOVERY_TENANT_LIMIT = 60;
const RECOVERY_GLOBAL_LIMIT = 2_000;
const RESET_TOKEN_LIMIT = 8;
const RESET_GLOBAL_LIMIT = 2_000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type PreparedRecovery = {
  recordId: string;
  userId: string;
  tenantId: string;
  branchId: string;
  email: string;
  tenantSlug: string;
  locale: string;
  token: string;
  expiresAt: Date;
};

export type RecoveryDelivery = (input: {
  email: string;
  tenantSlug: string;
  locale: string;
  token: string;
  resetUrl: string | null;
  expiresAt: Date;
}) => Promise<void>;

function productionRecoveryConfig() {
  const url = process.env.A1_MOBI_RECOVERY_WEBHOOK_URL?.trim();
  const secret = process.env.A1_MOBI_RECOVERY_WEBHOOK_SECRET?.trim();
  const production = process.env.NODE_ENV === "production";

  if (production) {
    if (!url || !secret) throw new Error("RECOVERY_DELIVERY_UNCONFIGURED");
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("RECOVERY_DELIVERY_UNCONFIGURED");
    }
    if (parsed.protocol !== "https:") throw new Error("RECOVERY_DELIVERY_UNCONFIGURED");
  }

  return { url, secret };
}

export function recoveryConfigurationStatus() {
  try {
    const { url, secret } = productionRecoveryConfig();
    return {
      ready: process.env.NODE_ENV !== "production" || Boolean(url && secret),
      delivery: url ? "configured" : "not-configured",
    };
  } catch {
    return { ready: false, delivery: "invalid" };
  }
}

async function webhookDelivery(input: {
  email: string;
  tenantSlug: string;
  locale: string;
  token: string;
  resetUrl: string | null;
  expiresAt: Date;
}) {
  const { url, secret } = productionRecoveryConfig();
  if (!url) throw new Error("RECOVERY_DELIVERY_UNCONFIGURED");

  const response = await fetch(url, {
    method: "POST",
    redirect: "error",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({
      email: input.email,
      tenant: input.tenantSlug,
      locale: input.locale,
      token: input.token,
      resetUrl: input.resetUrl,
      expiresAt: input.expiresAt.toISOString(),
    }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) throw new Error("RECOVERY_DELIVERY_FAILED");
}

async function consumeRecoveryRequestBudgets(tenant: string, email: string) {
  await purgeExpiredAuthAttempts();
  try {
    await consumeAuthBudget(authBudgetKey("recovery-global", []), RECOVERY_GLOBAL_LIMIT);
    await consumeAuthBudget(authBudgetKey("recovery-tenant", [tenant]), RECOVERY_TENANT_LIMIT);
    await consumeAuthBudget(
      authBudgetKey("recovery-account", [tenant, email]),
      RECOVERY_ACCOUNT_LIMIT,
    );
  } catch (error) {
    if (error instanceof AttemptBudgetExceeded) throw error;
    throw error;
  }
}

async function purgeOldResetTokens() {
  await db.passwordResetToken.deleteMany({
    where: {
      createdAt: { lt: new Date(Date.now() - RESET_RETENTION_MS) },
    },
  });
}

export async function preparePasswordRecovery(
  tenantSlug: string,
  email: string,
): Promise<PreparedRecovery | null> {
  const tenant = tenantSlug.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  await consumeRecoveryRequestBudgets(tenant, normalizedEmail);
  await purgeOldResetTokens();

  const user = await db.user.findFirst({
    where: {
      email: normalizedEmail,
      tenant: { slug: tenant },
      isActive: true,
      branch: { isNot: null },
    },
    include: { tenant: { select: { slug: true } }, branch: true },
  });

  if (!user?.branch || user.branch.tenantId !== user.tenantId) return null;

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  const record = await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
      deliveredAt: null,
    },
  });

  return {
    recordId: record.id,
    userId: user.id,
    tenantId: user.tenantId,
    branchId: user.branchId!,
    email: user.email,
    tenantSlug: user.tenant.slug,
    locale: user.locale,
    token,
    expiresAt,
  };
}

export async function deliverPreparedPasswordRecovery(
  prepared: PreparedRecovery,
  deliver: RecoveryDelivery = webhookDelivery,
) {
  const origin = process.env.APP_ORIGIN?.trim();
  const resetUrl = origin
    ? `${origin.replace(/\/$/, "")}/${prepared.locale === "ar" ? "ar" : "en"}/recover?token=${encodeURIComponent(prepared.token)}`
    : null;

  try {
    await deliver({
      email: prepared.email,
      tenantSlug: prepared.tenantSlug,
      locale: prepared.locale,
      token: prepared.token,
      resetUrl,
      expiresAt: prepared.expiresAt,
    });

    await db.$transaction(async tx => {
      const activated = await tx.passwordResetToken.updateMany({
        where: {
          id: prepared.recordId,
          userId: prepared.userId,
          usedAt: null,
          deliveredAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { deliveredAt: new Date() },
      });

      if (activated.count !== 1) return;

      await tx.passwordResetToken.updateMany({
        where: {
          userId: prepared.userId,
          id: { not: prepared.recordId },
          usedAt: null,
        },
        data: { usedAt: new Date() },
      });

      await tx.auditEvent.create({
        data: {
          tenantId: prepared.tenantId,
          branchId: prepared.branchId,
          actorId: prepared.userId,
          action: "auth.recovery.request",
          entityType: "User",
          entityId: prepared.userId,
          after: {
            expiresAt: prepared.expiresAt.toISOString(),
            delivered: true,
          },
        },
      });
    });

    return { delivered: true };
  } catch (error) {
    await db.passwordResetToken.updateMany({
      where: { id: prepared.recordId, usedAt: null },
      data: { usedAt: new Date() },
    });

    structuredLog("error", "auth.recovery_delivery_failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
      tenantSlug: prepared.tenantSlug,
      userId: prepared.userId,
    });

    return { delivered: false };
  }
}

export async function requestPasswordRecovery(
  tenantSlug: string,
  email: string,
  deliver: RecoveryDelivery = webhookDelivery,
) {
  const prepared = await preparePasswordRecovery(tenantSlug, email);
  if (!prepared) return { accepted: true, delivered: false };
  const result = await deliverPreparedPasswordRecovery(prepared, deliver);
  return { accepted: true, delivered: result.delivered };
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  await purgeExpiredAuthAttempts();
  try {
    await consumeAuthBudget(authBudgetKey("recovery-reset-global", []), RESET_GLOBAL_LIMIT);
  } catch (error) {
    if (error instanceof AttemptBudgetExceeded) throw error;
    throw error;
  }

  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("INVALID_RESET_TOKEN");
  const tokenHash = hashToken(token);

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { branch: true } } },
  });

  if (!record || record.usedAt || !record.deliveredAt || record.expiresAt <= new Date() ||
    !record.user.isActive || !record.user.branch ||
    record.user.branch.tenantId !== record.user.tenantId) {
    throw new Error("INVALID_RESET_TOKEN");
  }

  try {
    await consumeAuthBudget(
      authBudgetKey("recovery-reset-token", [tokenHash]),
      RESET_TOKEN_LIMIT,
    );
  } catch (error) {
    if (error instanceof AttemptBudgetExceeded) throw error;
    throw error;
  }

  const passwordHash = await hashPassword(newPassword);

  return db.$transaction(async tx => {
    const used = await tx.passwordResetToken.updateMany({
      where: {
        id: record.id,
        usedAt: null,
        deliveredAt: { not: null },
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });
    if (used.count !== 1) throw new Error("INVALID_RESET_TOKEN");

    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });

    await tx.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await tx.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: record.user.tenantId,
        branchId: record.user.branchId,
        actorId: record.userId,
        action: "auth.recovery.reset",
        entityType: "User",
        entityId: record.userId,
        before: { sessionsRevoked: false },
        after: { sessionsRevoked: true },
      },
    });

    return { tenantId: record.user.tenantId, userId: record.userId };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
