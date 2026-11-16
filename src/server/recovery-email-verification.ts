import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
import { consumeSensitiveActionBudget } from "./attempt-budget";
import { sendRecoveryEmailVerification } from "./recovery-email-mail";

const TTL_MS = 30 * 60 * 1000;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function requestRecoveryEmailVerification(input: {
  userId: string; tenantId: string; locale: string;
}, send = sendRecoveryEmailVerification) {
  await consumeSensitiveActionBudget("recovery-email-verify-send", [input.userId], 3);
  const user = await db.user.findFirst({ where: {
    id: input.userId, tenantId: input.tenantId, isActive: true,
  }, select: { recoveryEmail: true, recoveryEmailVerifiedAt: true } });
  if (!user?.recoveryEmail || user.recoveryEmailVerifiedAt) return { accepted: true, sent: false };
  const token = randomBytes(32).toString("base64url");
  const record = await db.recoveryEmailToken.create({ data: {
    userId: input.userId, email: user.recoveryEmail,
    tokenHash: hash(token), expiresAt: new Date(Date.now() + TTL_MS),
  } });
  try {
    await send({ email: user.recoveryEmail, token, locale: input.locale });
    const marked = await db.recoveryEmailToken.updateMany({ where: {
      id: record.id, userId: input.userId, deliveredAt: null, usedAt: null,
      expiresAt: { gt: new Date() },
    }, data: { deliveredAt: new Date() } });
    return { accepted: true, sent: marked.count === 1 };
  } catch {
    await db.recoveryEmailToken.updateMany({ where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() } });
    return { accepted: true, sent: false };
  }
}

export async function confirmRecoveryEmailVerification(input: {
  userId: string; tenantId: string; token: string;
}) {
  await consumeSensitiveActionBudget("recovery-email-verify-confirm", [input.userId], 10);
  if (!/^[A-Za-z0-9_-]{43}$/.test(input.token)) throw new Error("INVALID_VERIFICATION_TOKEN");
  const tokenHash = hash(input.token);
  return db.$transaction(async tx => {
    const record = await tx.recoveryEmailToken.findUnique({ where: { tokenHash } });
    if (!record || record.userId !== input.userId || record.usedAt || !record.deliveredAt ||
      record.expiresAt <= new Date()) throw new Error("INVALID_VERIFICATION_TOKEN");
    const updated = await tx.user.updateMany({ where: {
      id: input.userId, tenantId: input.tenantId, isActive: true,
      recoveryEmail: record.email, recoveryEmailVerifiedAt: null,
    }, data: { recoveryEmailVerifiedAt: new Date() } });
    if (updated.count !== 1) throw new Error("INVALID_VERIFICATION_TOKEN");
    await tx.recoveryEmailToken.updateMany({ where: { userId: input.userId, usedAt: null },
      data: { usedAt: new Date() } });
    return { verified: true };
  });
}
