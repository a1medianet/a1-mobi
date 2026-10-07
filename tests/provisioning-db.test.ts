import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { bootstrapStore } from "@/server/bootstrap-service";

const runDb = process.env.DATABASE_URL ? describe : describe.skip;

function bootstrapInput(suffix: string) {
  return {
    tenantSlug: "boot-" + suffix,
    tenantName: "Bootstrap test",
    branchCode: "MAIN",
    branchName: "Main",
    ownerEmail: "owner-" + suffix + "@example.test",
    ownerDisplayName: "Owner",
    ownerPassword: "owner-password-" + suffix,
    locale: "ar" as const,
  };
}

runDb("one-time foundation provisioning", () => {
  it("seeds permissions and an all-permission owner role exactly once, then refuses every later attempt", async () => {
    const suffix = randomUUID();
    const existingTenants = await db.tenant.count();

    if (existingTenants === 0) {
      // Only a genuinely empty database can safely exercise the success path.
      const result = await bootstrapStore(bootstrapInput(suffix));
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

      await expect(bootstrapStore(bootstrapInput("second-" + suffix)))
        .rejects.toThrow("ALREADY_PROVISIONED");

      await db.auditEvent.deleteMany({ where: { tenantId: result.tenantId } });
      await db.userRole.deleteMany({ where: { userId: result.ownerId } });
      await db.user.delete({ where: { id: result.ownerId } });
      await db.role.deleteMany({ where: { tenantId: result.tenantId } });
      await db.branch.deleteMany({ where: { tenantId: result.tenantId } });
      await db.tenant.delete({ where: { id: result.tenantId } });
    } else {
      // A shared/populated database must still refuse bootstrap; we cannot safely
      // clear it to exercise the success path without destroying other data.
      await expect(bootstrapStore(bootstrapInput(suffix)))
        .rejects.toThrow("ALREADY_PROVISIONED");
    }
  }, 60_000);
});
