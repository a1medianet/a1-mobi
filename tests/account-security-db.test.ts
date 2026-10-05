import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { hashPassword } from "@/core/auth/password";
import { createSessionToken } from "@/core/auth/session";
import { totpCode } from "@/core/auth/totp";
import { loginToStore } from "@/server/auth-service";
import { beginMfaSetup, disableMfa, enableMfa } from "@/server/mfa-service";
import { requestPasswordRecovery, resetPasswordWithToken } from "@/server/recovery-service";
import { authBudgetKey } from "@/server/attempt-budget";

const runDb = process.env.DATABASE_URL ? describe : describe.skip;
const originalKey = process.env.A1_MOBI_MFA_ENCRYPTION_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.A1_MOBI_MFA_ENCRYPTION_KEY;
  else process.env.A1_MOBI_MFA_ENCRYPTION_KEY = originalKey;
});

runDb("account security persistence", () => {
  it("blocks TOTP replay, preserves the current session on enable, and keeps recovery usable across delivery failure", async () => {
    process.env.A1_MOBI_MFA_ENCRYPTION_KEY = "cd".repeat(32);
    const suffix = randomUUID();
    const slug = "secure-" + suffix;
    const email = "owner-" + suffix + "@example.test";
    const password = "owner-password-" + suffix;

    const tenant = await db.tenant.create({ data: { slug, name: "Security" } });
    const branch = await db.branch.create({
      data: { tenantId: tenant.id, code: "MAIN", name: "Main" },
    });
    const user = await db.user.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        email,
        displayName: "Owner",
        passwordHash: await hashPassword(password),
      },
    });

    const currentToken = createSessionToken();
    const otherToken = createSessionToken();
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const currentSession = await db.session.create({
      data: { userId: user.id, tokenHash: currentToken.tokenHash, expiresAt: future },
    });
    const otherSession = await db.session.create({
      data: { userId: user.id, tokenHash: otherToken.tokenHash, expiresAt: future },
    });

    const ctx = {
      sessionId: currentSession.id,
      actorId: user.id,
      tenantId: tenant.id,
      branchId: branch.id,
    };

    try {
      const setup = await beginMfaSetup(ctx, password);
      expect(setup.recoveryCodes).toHaveLength(10);

      const enableCode = totpCode(setup.secret);
      await enableMfa(ctx, enableCode);

      expect((await db.session.findUniqueOrThrow({ where: { id: currentSession.id } })).revokedAt)
        .toBeNull();
      expect((await db.session.findUniqueOrThrow({ where: { id: otherSession.id } })).revokedAt)
        .not.toBeNull();

      await expect(beginMfaSetup(ctx, password)).rejects.toThrow("MFA_ALREADY_ENABLED");
      await expect(loginToStore(slug, email, password)).rejects.toThrow("MFA_REQUIRED");
      await expect(loginToStore(slug, email, password, enableCode)).rejects.toThrow("INVALID_MFA");

      const nextCode = totpCode(setup.secret, Date.now() + 30_000);
      expect((await loginToStore(slug, email, password, nextCode)).token).toHaveLength(43);
      await expect(loginToStore(slug, email, password, nextCode)).rejects.toThrow("INVALID_MFA");

      expect((await loginToStore(slug, email, password, setup.recoveryCodes[0])).token)
        .toHaveLength(43);
      await expect(loginToStore(slug, email, password, setup.recoveryCodes[0]))
        .rejects.toThrow("INVALID_MFA");

      const concurrentRecovery = await Promise.allSettled([
        loginToStore(slug, email, password, setup.recoveryCodes[2]),
        loginToStore(slug, email, password, setup.recoveryCodes[2]),
      ]);
      expect(concurrentRecovery.filter(result => result.status === "fulfilled")).toHaveLength(1);
      expect(concurrentRecovery.filter(result =>
        result.status === "rejected" &&
        result.reason instanceof Error &&
        result.reason.message === "INVALID_MFA")).toHaveLength(1);

      await disableMfa(ctx, password, setup.recoveryCodes[3]);
      expect(await db.mfaCredential.findUnique({ where: { userId: user.id } })).toBeNull();
      expect(await db.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);

      const active = await loginToStore(slug, email, password);
      expect(active.token).toHaveLength(43);

      let firstToken = "";
      const firstRequest = await requestPasswordRecovery(
        slug,
        email,
        async input => { firstToken = input.token; },
      );
      expect(firstRequest.delivered).toBe(true);
      expect(firstToken).toHaveLength(43);

      let failedToken = "";
      const failedRequest = await requestPasswordRecovery(
        slug,
        email,
        async input => {
          failedToken = input.token;
          throw new Error("SIMULATED_DELIVERY_FAILURE");
        },
      );
      expect(failedRequest.delivered).toBe(false);
      await expect(resetPasswordWithToken(failedToken, "blocked-password-" + suffix))
        .rejects.toThrow("INVALID_RESET_TOKEN");

      const newPassword = "new-owner-password-" + suffix;
      await resetPasswordWithToken(firstToken, newPassword);
      await expect(resetPasswordWithToken(firstToken, "another-password-" + suffix))
        .rejects.toThrow("INVALID_RESET_TOKEN");
      expect(await db.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
      await expect(loginToStore(slug, email, password)).rejects.toThrow("INVALID_CREDENTIALS");
      expect((await loginToStore(slug, email, newPassword)).token).toHaveLength(43);
    } finally {
      await db.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await db.mfaCredential.deleteMany({ where: { userId: user.id } });
      await db.auditEvent.deleteMany({ where: { tenantId: tenant.id } });
      await db.session.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
      await db.branch.delete({ where: { id: branch.id } });
      await db.tenant.delete({ where: { id: tenant.id } });

      const keys = [
        authBudgetKey("global", []),
        authBudgetKey("tenant", [slug]),
        authBudgetKey("account", [slug, email]),
        authBudgetKey("mfa-setup", [user.id]),
        authBudgetKey("mfa-enable", [user.id]),
        authBudgetKey("mfa-disable", [user.id]),
        authBudgetKey("recovery-global", []),
        authBudgetKey("recovery-tenant", [slug]),
        authBudgetKey("recovery-account", [slug, email]),
        authBudgetKey("recovery-reset-global", []),
      ];
      await db.authAttempt.deleteMany({ where: { key: { in: keys } } });
    }
  }, 120_000);
});
