import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { createSessionToken } from "@/core/auth/session";
import { resolveSessionContext } from "@/server/session-context";

const runDb = process.env.DATABASE_URL ? describe : describe.skip;
runDb("session database authorization", () => {
  it("resolves fresh permissions and rejects expired, revoked or inactive identity", async () => {
    const tenant = await db.tenant.create({ data: {
      slug: "session-test-" + randomUUID(), name: "Session authorization test",
    } });
    const branch = await db.branch.create({ data: {
      tenantId: tenant.id, code: "MAIN", name: "Main",
    } });
    const user = await db.user.create({ data: {
      tenantId: tenant.id, branchId: branch.id, email: "test@example.test",
      displayName: "Test user", passwordHash: "not-a-login-fixture",
    } });
    const role = await db.role.create({ data: {
      tenantId: tenant.id, code: "TEST", name: "Test",
    } });
    const permission = await db.permission.upsert({
      where: { code: "session.test" },
      create: { code: "session.test", description: "Session test permission" },
      update: {},
    });
    await db.rolePermission.create({ data: {
      roleId: role.id, permissionId: permission.id,
    } });
    await db.userRole.create({ data: { userId: user.id, roleId: role.id } });
    const { token, tokenHash } = createSessionToken();
    const future = new Date(Date.now() + 60_000);
    const session = await db.session.create({ data: {
      userId: user.id, tokenHash, expiresAt: future,
    } });
    try {
      const context = await resolveSessionContext(token);
      expect(context?.tenantId).toBe(tenant.id);
      expect(context?.branchId).toBe(branch.id);
      expect(context?.permissions.has("session.test")).toBe(true);
      await db.userRole.delete({ where: {
        userId_roleId: { userId: user.id, roleId: role.id },
      } });
      expect((await resolveSessionContext(token))?.permissions.size).toBe(0);
      await db.session.update({ where: { id: session.id }, data: {
        expiresAt: new Date(Date.now() - 1),
      } });
      expect(await resolveSessionContext(token)).toBeNull();
      await db.session.update({ where: { id: session.id }, data: {
        expiresAt: future, revokedAt: new Date(),
      } });
      expect(await resolveSessionContext(token)).toBeNull();
      await db.session.update({ where: { id: session.id }, data: { revokedAt: null } });
      await db.user.update({ where: { id: user.id }, data: { isActive: false } });
      expect(await resolveSessionContext(token)).toBeNull();
    } finally {
      await db.user.delete({ where: { id: user.id } });
      await db.role.delete({ where: { id: role.id } });
      await db.branch.delete({ where: { id: branch.id } });
      await db.tenant.delete({ where: { id: tenant.id } });
    }
  }, 60_000);
});
