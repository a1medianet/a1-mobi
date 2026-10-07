import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { bootstrapStore } from "@/server/bootstrap-service";

const runDb = process.env.DATABASE_URL ? describe : describe.skip;

function bootstrapInput(suffix: string) {
  return {
    tenantSlug: "boot-" + suffix,
    tenantName: "Bootstrap test " + suffix,
    branchCode: "MAIN",
    branchName: "Main",
    ownerEmail: "owner-" + suffix + "@example.test",
    ownerDisplayName: "Owner",
    ownerPassword: "owner-password-" + suffix,
    locale: "ar" as const,
  };
}

runDb("multi-tenant foundation provisioning", () => {
  it("creates isolated tenants and refuses duplicate tenant identity", async () => {
    const suffix = randomUUID();
    const secondSuffix = randomUUID();
    const first = await bootstrapStore(bootstrapInput(suffix));
    const second = await bootstrapStore(bootstrapInput(secondSuffix));

    try {
      expect(first.tenantId).not.toBe(second.tenantId);
      expect(first.billingTenantKey).toBe("mobi:boot-" + suffix);
      expect(second.billingTenantKey).toBe("mobi:boot-" + secondSuffix);

      for (const result of [first, second]) {
        const owner = await db.user.findUniqueOrThrow({
          where: { id: result.ownerId },
          include: { userRoles: { include: { role: { include: { permissions: true } } } } },
        });
        expect(owner.userRoles).toHaveLength(1);
        expect(owner.userRoles[0].role.isSystem).toBe(true);
        const permissionCount = await db.permission.count();
        expect(permissionCount).toBeGreaterThan(0);
        expect(owner.userRoles[0].role.permissions).toHaveLength(permissionCount);
        expect(await db.auditEvent.count({
          where: { tenantId: result.tenantId, action: "foundation.bootstrap" },
        })).toBe(1);
      }

      await expect(bootstrapStore(bootstrapInput(suffix))).rejects.toThrow("CONFLICT");
    } finally {
      for (const result of [first, second]) {
        await db.auditEvent.deleteMany({ where: { tenantId: result.tenantId } });
        await db.userRole.deleteMany({ where: { userId: result.ownerId } });
        await db.user.deleteMany({ where: { id: result.ownerId } });
        await db.role.deleteMany({ where: { tenantId: result.tenantId } });
        await db.branch.deleteMany({ where: { tenantId: result.tenantId } });
        await db.tenant.deleteMany({ where: { id: result.tenantId } });
      }
    }
  }, 60_000);
});
