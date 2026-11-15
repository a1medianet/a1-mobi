import { cookies } from "next/headers";
import { db } from "@/server/db";
import { hashSessionToken, createSessionToken } from "@/core/auth/session";
import { verifyPassword } from "@/core/auth/password";
import { consumeSensitiveActionBudget, authBudgetKey } from "@/server/attempt-budget";
import { decryptTotpSecret, matchTotpCounter } from "@/core/auth/totp";

const MAX_AGE = 60 * 60;
export const platformCookieName = () => process.env.NODE_ENV === "production" ? "__Host-a1-mobi-platform" : "a1-mobi-platform";
export const platformCookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge: MAX_AGE });

export async function platformLogin(email: string, password: string, secondFactor: string) {
  const normalized = email.trim().toLowerCase();
  await consumeSensitiveActionBudget("platform-login", [normalized], 5);
  const admin = await db.platformAdmin.findUnique({ where: { email: normalized } });
  // Verify even when absent to avoid an easy account enumeration timing signal.
  const fallback = "$argon2id$v=19$m=65536,t=3,p=4$Wm1UNVZkRjJvZGx1Q3dwYQ$V0yt0lFjC7HR6m2is6j2n0iAiqjE/ChNdXYB8Jt5Y7s";
  let valid = false;
  try { valid = await verifyPassword(admin?.passwordHash ?? fallback, password); } catch { valid = false; }
  if (!admin?.isActive || !valid) return null;
  const counter = matchTotpCounter(decryptTotpSecret(admin.totpSecretCipher), secondFactor);
  if (counter === null) return null;
  const { token, tokenHash } = createSessionToken();
  const issued = await db.$transaction(async tx => {
    const updated = await tx.platformAdmin.updateMany({ where: { id: admin.id, isActive: true, OR: [{ lastTotpCounter: null }, { lastTotpCounter: { lt: counter } }] }, data: { lastTotpCounter: counter } });
    if (!updated.count) return false;
    await tx.platformSession.create({ data: { adminId: admin.id, tokenHash, expiresAt: new Date(Date.now() + MAX_AGE * 1000) } });
    await tx.authAttempt.deleteMany({ where: { key: authBudgetKey("platform-login", [normalized]) } });
    return true;
  });
  if (!issued) return null;
  return token;
}

export async function currentPlatformAdmin() {
  const token = (await cookies()).get(platformCookieName())?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const session = await db.platformSession.findUnique({ where: { tokenHash: hashSessionToken(token) }, include: { admin: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.admin.isActive) return null;
  return { id: session.admin.id, email: session.admin.email };
}

export async function platformLogout(token: string | undefined) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  await db.platformSession.updateMany({ where: { tokenHash: hashSessionToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
}
