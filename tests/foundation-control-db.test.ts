import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { hashPassword } from "@/core/auth/password";
import { createSessionToken } from "@/core/auth/session";
import {
  createStoreUser,
  createTenantRole,
  updateStoreUser,
  updateTenantRole,
  type ControlContext,
} from "@/server/foundation-control";

const runDb = process.env.DATABASE_URL ? describe : describe.skip;

runDb("foundation control persistence", () => {
  it("enforces tenant role boundaries and revokes sessions on password/deactivation", async () => {
    const suffix = randomUUID();
    const tenant = await db.tenant.create({ data: { slug: "ctl-" + suffix, name: "Control" } });
    const other = await db.tenant.create({ data: { slug: "other-" + suffix, name: "Other" } });
    const branch = await db.branch.create({ data: { tenantId: tenant.id, code: "MAIN", name: "Main" } });
    const otherBranch = await db.branch.create({ data: { tenantId: other.id, code: "MAIN", name: "Main" } });
    const actor = await db.user.create({ data: {
      tenantId: tenant.id, branchId: branch.id, email: "owner-" + suffix + "@example.test",
      displayName: "Owner", passwordHash: await hashPassword("owner-password-" + suffix),
    } });
    const otherRole = await db.role.create({ data: {
      tenantId: other.id, code: "foreign", name: "Foreign",
    } });
    const systemRole = await db.role.create({ data: {
      tenantId: tenant.id, code: "system-admin", name: "System Admin", isSystem: true,
    } });
    const cashPermission = await db.permission.upsert({
      where: { code: "cash.manage" },
      create: { code: "cash.manage", description: "Cash administration" },
      update: {},
    });
    const privilegedRole = await db.role.create({ data: {
      tenantId: tenant.id, code: "cash-admin-" + suffix.slice(0, 8), name: "Cash Admin",
    } });
    await db.rolePermission.create({
      data: { roleId: privilegedRole.id, permissionId: cashPermission.id },
    });
    const ctx: ControlContext = {
      actorId: actor.id, tenantId: tenant.id, branchId: branch.id,
      permissions: new Set(["users.manage", "roles.manage", "catalog.read", "sell.create"]),
    };
    let createdId = "";
    try {
      await expect(createStoreUser(ctx, {
        email: "blocked-" + suffix + "@example.test",
        displayName: "Blocked",
        password: "blocked-password-" + suffix,
        locale: "en",
        roleIds: [otherRole.id],
      })).rejects.toThrow("INVALID_ROLE");
      await expect(createStoreUser(ctx, {
        email: "system-blocked-" + suffix + "@example.test",
        displayName: "System blocked",
        password: "system-blocked-password-" + suffix,
        locale: "en",
        roleIds: [systemRole.id],
      })).rejects.toThrow("PERMISSION_DENIED");
      await expect(createStoreUser(ctx, {
        email: "delegation-blocked-" + suffix + "@example.test",
        displayName: "Delegation blocked",
        password: "delegation-blocked-password-" + suffix,
        locale: "en",
        roleIds: [privilegedRole.id],
      })).rejects.toThrow("PERMISSION_DENIED");

      await expect(createTenantRole(ctx, {
        code: "escalate-" + suffix.slice(0, 8),
        name: "Escalation attempt",
        permissions: ["foundation.manage"],
      })).rejects.toThrow("PERMISSION_DENIED");

      const role = await createTenantRole(ctx, {
        code: "seller-" + suffix.slice(0, 8),
        name: "Seller",
        permissions: ["catalog.read", "sell.create"],
      });
      await expect(updateTenantRole(ctx, role.id, {
        permissions: ["catalog.read", "foundation.manage"],
      })).rejects.toThrow("PERMISSION_DENIED");
      await expect(createTenantRole(ctx, {
        code: "bad-" + suffix.slice(0, 8),
        name: "Bad",
        permissions: ["not.real.permission"],
      })).rejects.toThrow("INVALID_PERMISSION");

      const created = await createStoreUser(ctx, {
        email: "seller-" + suffix + "@example.test",
        displayName: "Seller",
        password: "seller-password-" + suffix,
        locale: "ar",
        roleIds: [role.id],
      });
      createdId = created.id;
      await expect(updateStoreUser(ctx, created.id, {
        roleIds: [privilegedRole.id],
      })).rejects.toThrow("PERMISSION_DENIED");
      const token = createSessionToken();
      await db.session.create({ data: {
        userId: created.id, tokenHash: token.tokenHash,
        expiresAt: new Date(Date.now() + 60_000),
      } });
      await updateStoreUser(ctx, created.id, { password: "new-password-" + suffix });
      expect((await db.session.findFirstOrThrow({ where: { userId: created.id } })).revokedAt).not.toBeNull();

      const token2 = createSessionToken();
      await db.session.create({ data: {
        userId: created.id, tokenHash: token2.tokenHash,
        expiresAt: new Date(Date.now() + 60_000),
      } });
      await updateStoreUser(ctx, created.id, { isActive: false });
      const activeSessions = await db.session.count({ where: { userId: created.id, revokedAt: null } });
      expect(activeSessions).toBe(0);

      await expect(updateStoreUser(ctx, actor.id, { isActive: false })).rejects.toThrow("SELF_PROTECTION");
      expect(await db.auditEvent.count({
        where: { tenantId: tenant.id, action: { startsWith: "foundation." } },
      })).toBeGreaterThanOrEqual(4);
    } finally {
      await db.auditEvent.deleteMany({ where: { tenantId: { in: [tenant.id, other.id] } } });
      if (createdId) await db.user.deleteMany({ where: { id: createdId } });
      await db.user.deleteMany({ where: { id: actor.id } });
      await db.role.deleteMany({ where: { tenantId: { in: [tenant.id, other.id] } } });
      await db.branch.deleteMany({ where: { id: { in: [branch.id, otherBranch.id] } } });
      await db.tenant.deleteMany({ where: { id: { in: [tenant.id, other.id] } } });
    }
  }, 90_000);
});
