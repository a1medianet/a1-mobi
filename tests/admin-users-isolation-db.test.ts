import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { hashPassword } from "@/core/auth/password";
import { listStoreUsers, type ControlContext } from "@/server/foundation-control";

const runDb = process.env.DATABASE_URL ? describe : describe.skip;

runDb("store user listing isolation", () => {
  it("only returns users scoped to the actor's own tenant and branch", async () => {
    const suffix = randomUUID();
    const tenant = await db.tenant.create({ data: { slug: "iso-" + suffix, name: "Isolation" } });
    const otherTenant = await db.tenant.create({ data: { slug: "iso-other-" + suffix, name: "Other" } });
    const branchA = await db.branch.create({ data: { tenantId: tenant.id, code: "A", name: "Branch A" } });
    const branchB = await db.branch.create({ data: { tenantId: tenant.id, code: "B", name: "Branch B" } });
    const otherBranch = await db.branch.create({ data: { tenantId: otherTenant.id, code: "MAIN", name: "Main" } });
    const passwordHash = await hashPassword("isolation-password-" + suffix);
    const userA = await db.user.create({ data: {
      tenantId: tenant.id, branchId: branchA.id, email: "a-" + suffix + "@example.test",
      displayName: "User A", passwordHash,
    } });
    const userB = await db.user.create({ data: {
      tenantId: tenant.id, branchId: branchB.id, email: "b-" + suffix + "@example.test",
      displayName: "User B", passwordHash,
    } });
    const userOther = await db.user.create({ data: {
      tenantId: otherTenant.id, branchId: otherBranch.id, email: "c-" + suffix + "@example.test",
      displayName: "User Other", passwordHash,
    } });
    try {
      const ctx: ControlContext = {
        actorId: userA.id, tenantId: tenant.id, branchId: branchA.id,
        permissions: new Set(["users.manage"]),
      };
      const users = await listStoreUsers(ctx);
      const ids = users.map(u => u.id);
      expect(ids).toContain(userA.id);
      expect(ids).not.toContain(userB.id);
      expect(ids).not.toContain(userOther.id);
    } finally {
      await db.user.deleteMany({ where: { id: { in: [userA.id, userB.id, userOther.id] } } });
      await db.branch.deleteMany({ where: { id: { in: [branchA.id, branchB.id, otherBranch.id] } } });
      await db.tenant.deleteMany({ where: { id: { in: [tenant.id, otherTenant.id] } } });
    }
  }, 60_000);
});
