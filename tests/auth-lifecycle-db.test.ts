import { createHash, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { hashPassword } from "@/core/auth/password";
import { hashSessionToken } from "@/core/auth/session";
import { loginToStore, logoutSession } from "@/server/auth-service";
import { authBudgetKey } from "@/server/attempt-budget";
import { resolveSessionContext } from "@/server/session-context";
const runDb = process.env.DATABASE_URL ? describe : describe.skip;
runDb("persisted authentication lifecycle", () => {
  it("isolates stores, rotates tokens, revokes on logout and persists a concurrent budget", async () => {
    const slug = "auth-" + randomUUID(), otherSlug = "auth-other-" + randomUUID();
    const password = randomUUID(), passwordHash = await hashPassword(password);
    const tenant = await db.tenant.create({ data: { slug, name: "Auth test" } });
    const other = await db.tenant.create({ data: { slug: otherSlug, name: "Other" } });
    const branch = await db.branch.create({ data: { tenantId: tenant.id, code: "MAIN", name: "Main" } });
    const user = await db.user.create({ data: { tenantId: tenant.id, branchId: branch.id,
      email: "login@example.test", displayName: "Test", passwordHash } });
    try {
      await expect(loginToStore(otherSlug, user.email, password)).rejects.toThrow("INVALID_CREDENTIALS");
      const first = await loginToStore(slug, " LOGIN@example.test ", password);
      const second = await loginToStore(slug, user.email, password);
      expect(first.token).not.toBe(second.token);
      const stored = await db.session.findUniqueOrThrow({ where: { tokenHash: hashSessionToken(first.token) } });
      expect(stored.tokenHash).not.toBe(first.token);
      expect((await resolveSessionContext(first.token))?.tenantId).toBe(tenant.id);
      await logoutSession(first.token); await logoutSession(first.token);
      expect(await resolveSessionContext(first.token)).toBeNull();
      expect(await resolveSessionContext(second.token)).not.toBeNull();
      expect(await db.auditEvent.count({ where: { actorId: user.id, action: "auth.logout" } })).toBe(1);
      await db.user.update({ where: { id: user.id }, data: { isActive: false } });
      await expect(loginToStore(slug, user.email, password)).rejects.toThrow("INVALID_CREDENTIALS");
      await db.user.update({ where: { id: user.id }, data: { isActive: true, branchId: null } });
      await expect(loginToStore(slug, user.email, password)).rejects.toThrow("INVALID_CREDENTIALS");
      await db.user.update({ where: { id: user.id }, data: { branchId: branch.id } });

      // Successful authentication now resets the per-account failure budget.
      // Exercise the limiter with concurrent invalid credentials instead of valid logins.
      const accountKey = authBudgetKey("account", [slug, user.email]);
      await db.authAttempt.deleteMany({ where: { key: accountKey } });
      const concurrent = await Promise.allSettled(Array.from({ length: 8 },
        (_, index) => loginToStore(slug, user.email, "wrong-password-" + index)));
      expect(concurrent.filter(x => x.status === "rejected" &&
        x.reason.message === "INVALID_CREDENTIALS")).toHaveLength(5);
      expect(concurrent.filter(x => x.status === "rejected" &&
        x.reason.message === "RATE_LIMITED")).toHaveLength(3);
    } finally {
      await db.auditEvent.deleteMany({ where: { tenantId: tenant.id } });
      await db.user.delete({ where: { id: user.id } });
      await db.branch.delete({ where: { id: branch.id } });
      await db.tenant.deleteMany({ where: { id: { in: [tenant.id, other.id] } } });
      for (const s of [slug, otherSlug]) {
        const key = createHash("sha256").update(JSON.stringify([s, user.email])).digest("hex");
        await db.authAttempt.deleteMany({ where: { key } });
      }
    }
  }, 60_000);
});
