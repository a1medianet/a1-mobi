import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { hashPassword } from "@/core/auth/password";
import { totpCode } from "@/core/auth/totp";
import { loginToStore } from "@/server/auth-service";
import { beginMfaSetup, enableMfa } from "@/server/mfa-service";
import { authBudgetKey } from "@/server/attempt-budget";

const runDb = process.env.DATABASE_URL ? describe : describe.skip;
const originalKey = process.env.A1_MOBI_MFA_ENCRYPTION_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.A1_MOBI_MFA_ENCRYPTION_KEY;
  else process.env.A1_MOBI_MFA_ENCRYPTION_KEY = originalKey;
});

runDb("MFA concurrency guarantees", () => {
  it("allows only one concurrent use of the same TOTP or recovery code", async () => {
    process.env.A1_MOBI_MFA_ENCRYPTION_KEY = "12".repeat(32);
    const suffix = randomUUID();
    const slug = "mfa-race-" + suffix;
    const email = "owner-" + suffix + "@example.test";
    const password = "owner-password-" + suffix;
    const tenant = await db.tenant.create({ data: { slug, name: "MFA race" } });
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
    const ctx = { actorId: user.id, tenantId: tenant.id, branchId: branch.id };

    try {
      const setup = await beginMfaSetup(ctx, password);
      await enableMfa(ctx, totpCode(setup.secret));

      await db.authAttempt.deleteMany({
        where: { key: authBudgetKey("account", [slug, email]) },
      });

      const totp = totpCode(setup.secret, Date.now() + 30_000);
      const totpResults = await Promise.allSettled([
        loginToStore(slug, email, password, totp),
        loginToStore(slug, email, password, totp),
      ]);
      expect(totpResults.filter(result => result.status === "fulfilled")).toHaveLength(1);

      await db.authAttempt.deleteMany({
        where: { key: authBudgetKey("account", [slug, email]) },
      });

      const recovery = setup.recoveryCodes[0];
      const recoveryResults = await Promise.allSettled([
        loginToStore(slug, email, password, recovery),
        loginToStore(slug, email, password, recovery),
      ]);
      expect(recoveryResults.filter(result => result.status === "fulfilled")).toHaveLength(1);
    } finally {
      await db.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await db.mfaCredential.deleteMany({ where: { userId: user.id } });
      await db.auditEvent.deleteMany({ where: { tenantId: tenant.id } });
      await db.session.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
      await db.branch.delete({ where: { id: branch.id } });
      await db.tenant.delete({ where: { id: tenant.id } });
      await db.authAttempt.deleteMany({
        where: { key: { in: [
          authBudgetKey("global", []),
          authBudgetKey("tenant", [slug]),
          authBudgetKey("account", [slug, email]),
          authBudgetKey("mfa-setup", [user.id]),
          authBudgetKey("mfa-enable", [user.id]),
        ] } },
      });
    }
  }, 120_000);
});
