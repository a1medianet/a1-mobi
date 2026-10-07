import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { hashPassword, verifyPassword } from "@/core/auth/password";
import { createSessionToken, hashSessionToken } from "@/core/auth/session";
import { db } from "./db";
import {
  AttemptBudgetExceeded,
  authBudgetKey,
  consumeAuthBudget,
  consumeSensitiveActionBudget,
  purgeExpiredAuthAttempts,
} from "./attempt-budget";
import { verifyUserSecondFactor } from "./mfa-service";

export const SESSION_SECONDS = 8 * 60 * 60;

export class AuthFailure extends Error {
  constructor(public code:
    | "INVALID_CREDENTIALS"
    | "RATE_LIMITED"
    | "MFA_REQUIRED"
    | "INVALID_MFA"
  ) {
    super(code);
  }
}

const dummyHash = hashPassword(randomUUID());
const ACCOUNT_ATTEMPT_LIMIT = 5;
const TENANT_ATTEMPT_LIMIT = 120;
const GLOBAL_ATTEMPT_LIMIT = 5_000;

async function consumeLoginBudgets(tenant: string, email: string) {
  try {
    await purgeExpiredAuthAttempts();
    await consumeAuthBudget(authBudgetKey("global", []), GLOBAL_ATTEMPT_LIMIT);
    await consumeAuthBudget(authBudgetKey("tenant", [tenant]), TENANT_ATTEMPT_LIMIT);
    await consumeAuthBudget(authBudgetKey("account", [tenant, email]), ACCOUNT_ATTEMPT_LIMIT);
  } catch (error) {
    if (error instanceof AttemptBudgetExceeded) throw new AuthFailure("RATE_LIMITED");
    throw error;
  }
}

export async function loginToStore(
  tenantSlug: string,
  email: string,
  password: string,
  secondFactor?: string,
) {
  const slug = tenantSlug.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();
  const accountBudgetKey = authBudgetKey("account", [slug, normalizedEmail]);
  await consumeLoginBudgets(slug, normalizedEmail);

  const user = await db.user.findFirst({
    where: { email: normalizedEmail, tenant: { slug } },
    include: { branch: true },
  });

  let valid = false;
  try {
    valid = await verifyPassword(user?.passwordHash ?? await dummyHash, password);
  } catch {
    valid = false;
  }

  if (!valid || !user?.isActive || !user.branch || user.branch.tenantId !== user.tenantId) {
    throw new AuthFailure("INVALID_CREDENTIALS");
  }

  await db.authAttempt.deleteMany({ where: { key: accountBudgetKey } });
  const mfaBudgetKey = authBudgetKey("mfa-login", [user.id]);
  try {
    await consumeSensitiveActionBudget("mfa-login", [user.id], 5);
  } catch (error) {
    if (error instanceof AttemptBudgetExceeded) throw new AuthFailure("RATE_LIMITED");
    throw error;
  }

  const { token, tokenHash } = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);

  try {
    await db.$transaction(async tx => {
      const current = await tx.user.findUnique({
        where: { id: user.id },
        include: { branch: true },
      });

      if (!current?.isActive || current.passwordHash !== user.passwordHash ||
        current.tenantId !== user.tenantId || !current.branch ||
        current.branch.tenantId !== current.tenantId || current.branchId !== user.branchId) {
        throw new AuthFailure("INVALID_CREDENTIALS");
      }

      let secondFactorResult;
      try {
        secondFactorResult = await verifyUserSecondFactor(tx, current.id, secondFactor);
      } catch (error) {
        if (error instanceof Error &&
          (error.message === "MFA_REQUIRED" || error.message === "INVALID_MFA")) {
          throw new AuthFailure(error.message);
        }
        throw error;
      }

      const session = await tx.session.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });
      await tx.auditEvent.create({
        data: {
          tenantId: user.tenantId,
          branchId: user.branchId,
          actorId: user.id,
          action: "auth.login",
          entityType: "Session",
          entityId: session.id,
          after: {
            expiresAt: expiresAt.toISOString(),
            secondFactorMethod: secondFactorResult.method,
            ...(secondFactorResult.recoveryCodesRemaining !== undefined
              ? { recoveryCodesRemaining: secondFactorResult.recoveryCodesRemaining }
              : {}),
          },
        },
      });
      // Successful full authentication resets the per-account failure budget.
      await tx.authAttempt.deleteMany({ where: { key: { in: [accountBudgetKey, mfaBudgetKey] } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof AuthFailure) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new AuthFailure("INVALID_MFA");
    }
    throw error;
  }

  return { token, expiresAt };
}

export async function logoutSession(token: string | undefined) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  await db.$transaction(async tx => {
    const session = await tx.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: { include: { branch: true } } },
    });
    if (!session || session.revokedAt) return;

    const result = await tx.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (result.count && session.user.branch?.tenantId === session.user.tenantId) {
      await tx.auditEvent.create({
        data: {
          tenantId: session.user.tenantId,
          branchId: session.user.branchId,
          actorId: session.userId,
          action: "auth.logout",
          entityType: "Session",
          entityId: session.id,
          before: { revoked: false },
          after: { revoked: true },
        },
      });
    }
  });
}
