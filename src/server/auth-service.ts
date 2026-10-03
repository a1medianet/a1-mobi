import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { hashPassword, verifyPassword } from "@/core/auth/password";
import { createSessionToken, hashSessionToken } from "@/core/auth/session";
import { db } from "./db";

export const SESSION_SECONDS = 8 * 60 * 60;
export class AuthFailure extends Error {
  constructor(public code: "INVALID_CREDENTIALS" | "RATE_LIMITED") { super(code); }
}
const dummyHash = hashPassword(randomUUID());

// Shared database budget survives worker restarts; no client IP/header is trusted.
async function consumeAttempt(tenant: string, email: string) {
  const key = createHash("sha256").update(JSON.stringify([tenant, email])).digest("hex");
  const rows = await db.$queryRaw<Array<{ attempts: number }>>(Prisma.sql`
    INSERT INTO "AuthAttempt" ("key", "attempts", "windowStart") VALUES (${key}, 1, NOW())
    ON CONFLICT ("key") DO UPDATE SET
    "attempts" = CASE WHEN "AuthAttempt"."windowStart" <= NOW() - INTERVAL '15 minutes'
      THEN 1 ELSE "AuthAttempt"."attempts" + 1 END,
    "windowStart" = CASE WHEN "AuthAttempt"."windowStart" <= NOW() - INTERVAL '15 minutes'
      THEN NOW() ELSE "AuthAttempt"."windowStart" END RETURNING "attempts"`);
  if (rows[0].attempts > 5) throw new AuthFailure("RATE_LIMITED");
}
export async function loginToStore(tenantSlug: string, email: string, password: string) {
  const slug = tenantSlug.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();
  await consumeAttempt(slug, normalizedEmail);
  const user = await db.user.findFirst({ where: {
    email: normalizedEmail, tenant: { slug },
  }, include: { branch: true } });
  let valid = false;
  try { valid = await verifyPassword(user?.passwordHash ?? await dummyHash, password); }
  catch { valid = false; }
  if (!valid || !user?.isActive || !user.branch || user.branch.tenantId !== user.tenantId) {
    throw new AuthFailure("INVALID_CREDENTIALS");
  }
  const { token, tokenHash } = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await db.$transaction(async tx => {
    // Recheck identity inside the transaction before issuing a fresh session.
    const current = await tx.user.findUnique({ where: { id: user.id }, include: { branch: true } });
    if (!current?.isActive || current.passwordHash !== user.passwordHash ||
      current.tenantId !== user.tenantId || !current.branch ||
      current.branch.tenantId !== current.tenantId || current.branchId !== user.branchId) {
      throw new AuthFailure("INVALID_CREDENTIALS");
    }
    const session = await tx.session.create({ data: { userId: user.id, tokenHash, expiresAt } });
    await tx.auditEvent.create({ data: {
      tenantId: user.tenantId, branchId: user.branchId, actorId: user.id,
      action: "auth.login", entityType: "Session", entityId: session.id,
      after: { expiresAt: expiresAt.toISOString() },
    } });
  });
  return { token, expiresAt };
}

export async function logoutSession(token: string | undefined) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  await db.$transaction(async tx => {
    const session = await tx.session.findUnique({ where: { tokenHash: hashSessionToken(token) },
      include: { user: { include: { branch: true } } } });
    if (!session || session.revokedAt) return;
    const result = await tx.session.updateMany({ where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() } });
    if (result.count && session.user.branch?.tenantId === session.user.tenantId) {
      await tx.auditEvent.create({ data: {
        tenantId: session.user.tenantId, branchId: session.user.branchId,
        actorId: session.userId, action: "auth.logout", entityType: "Session",
        entityId: session.id, before: { revoked: false }, after: { revoked: true },
      } });
    }
  });
}
