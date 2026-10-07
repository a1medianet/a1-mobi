import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { hashPassword } from "@/core/auth/password";
import { totpCode } from "@/core/auth/totp";
import { authBudgetKey } from "@/server/attempt-budget";
import { beginMfaSetup, disableMfa, enableMfa } from "@/server/mfa-service";

const runDb = process.env.DATABASE_URL ? describe : describe.skip;
const originalKey = process.env.A1_MOBI_MFA_ENCRYPTION_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.A1_MOBI_MFA_ENCRYPTION_KEY;
  else process.env.A1_MOBI_MFA_ENCRYPTION_KEY = originalKey;
});

runDb("MFA action budgets", () => {
  it("limits repeated invalid setup and disable attempts", async () => {
    process.env.A1_MOBI_MFA_ENCRYPTION_KEY = "34".repeat(32);
    const suffix = randomUUID();
    const tenant = await db.tenant.create({
      data: { slug: "mfa-limit-" + suffix, name: "MFA limits" },
    });
    const branch = await db.branch.create({
      data: { tenantId: tenant.id, code: "MAIN", name: "Main" },
    });
    const password = "owner-password-" + suffix;
    const user = await db.user.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        email: "owner-" + suffix + "@example.test",
        displayName: "Owner",
        passwordHash: await hashPassword(password),
      },
    });
    const ctx = { actorId: user.id, tenantId: tenant.id, branchId: branch.id };
    const setupKey = authBudgetKey("mfa-setup", [user.id]);
    const enableKey = authBudgetKey("mfa-enable", [user.id]);
    const disableKey = authBudgetKey("mfa-disable", [user.id]);

    try {
      for (let i = 0; i < 5; i += 1) {
        await expect(beginMfaSetup(ctx, "incorrect-password-" + i))
          .rejects.toThrow("INVALID_CREDENTIALS");
      }
      await expect(beginMfaSetup(ctx, "incorrect-password-final"))
        .rejects.toThrow("RATE_LIMITED");

      await db.authAttempt.deleteMany({ where: { key: setupKey } });
      const setup = await beginMfaSetup(ctx, password);
      await enableMfa(ctx, totpCode(setup.secret));

      for (let i = 0; i < 5; i += 1) {
        await expect(disableMfa(ctx, "incorrect-password-" + i, setup.recoveryCodes[0]))
          .rejects.toThrow("INVALID_CREDENTIALS");
      }
      await expect(disableMfa(ctx, "incorrect-password-final", setup.recoveryCodes[0]))
        .rejects.toThrow("RATE_LIMITED");
    } finally {
      await db.mfaCredential.deleteMany({ where: { userId: user.id } });
      await db.auditEvent.deleteMany({ where: { tenantId: tenant.id } });
      await db.session.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
      await db.branch.delete({ where: { id: branch.id } });
      await db.tenant.delete({ where: { id: tenant.id } });
      await db.authAttempt.deleteMany({
        where: { key: { in: [setupKey, enableKey, disableKey] } },
      });
    }
  }, 120_000);
});
