import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { closeCashSession, openCashSession } from "@/modules/cash/cash-service";

const allowed = (() => {
  try {
    const url = new URL(process.env.DATABASE_URL || "");
    return url.hostname === "127.0.0.1" && url.port === "5438" &&
      url.pathname === "/mobi_uat" && ["postgresql:", "postgres:"].includes(url.protocol);
  } catch { return false; }
})();
const runDb = allowed ? describe : describe.skip;

runDb("C-14/01 cash variance authorization PostgreSQL UAT (synthetic only)", () => {
  it("requires independent branch cash manager approval before recording a variance", async () => {
    const tag = randomUUID().slice(0, 12);
    const tenant = await db.tenant.create({ data: { slug: "c14cash-" + tag, name: "C14 synthetic UAT" } });
    const branchA = await db.branch.create({
      data: { tenantId: tenant.id, code: "MAIN", name: "Synthetic A" },
    });
    const branchB = await db.branch.create({
      data: { tenantId: tenant.id, code: "OTHER", name: "Synthetic B" },
    });
    const makeUser = (branchId: string, role: string) => db.user.create({ data: {
      tenantId: tenant.id, branchId, email: role + tag + "@example.test",
      displayName: "Synthetic " + role, passwordHash: "fixture-only",
    } });
    const [actor, manager, outsider, noPermission] = await Promise.all([
      makeUser(branchA.id, "cashier"), makeUser(branchA.id, "manager"),
      makeUser(branchB.id, "otherbranch"), makeUser(branchA.id, "noauthority"),
    ]);
    const permission = await db.permission.upsert({
      where: { code: "cash.manage" }, update: {},
      create: { code: "cash.manage", description: "Manage cash drawer" },
    });
    const role = await db.role.create({
      data: { tenantId: tenant.id, code: "C14_APPROVER", name: "C14 test approver" },
    });
    await db.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
    await db.userRole.create({ data: { userId: manager.id, roleId: role.id } });
    const session = await openCashSession({
      tenantId: tenant.id, branchId: branchA.id, actorId: actor.id,
      openingUsd: 30, openingLbp: 0, openingExchangeRate: 90000,
    });
    const common = { tenantId: tenant.id, branchId: branchA.id, actorId: actor.id,
      cashSessionId: session.id, physicalUsd: 29, physicalLbp: 0, closingExchangeRate: 90000,
      varianceReason: "Synthetic one-dollar physical count variance" };

    await expect(closeCashSession({ ...common, approverId: actor.id }))
      .rejects.toThrow("SELF_APPROVAL_FORBIDDEN");
    await expect(closeCashSession({ ...common, approverId: outsider.id }))
      .rejects.toThrow("APPROVER_NOT_AUTHORIZED");
    await expect(closeCashSession({ ...common, approverId: noPermission.id }))
      .rejects.toThrow("APPROVER_NOT_AUTHORIZED");
    expect((await db.cashSession.findUniqueOrThrow({ where: { id: session.id } })).status)
      .toBe("OPEN");
    const closed = await closeCashSession({ ...common, approverId: manager.id });
    expect(closed.status).toBe("CLOSED");
    expect(Number(closed.expectedBase)).toBe(30);
    expect(Number(closed.varianceBase)).toBe(-1);
    expect(closed.varianceApproverId).toBe(manager.id);
    expect((await db.auditEvent.count({
      where: { tenantId: tenant.id, branchId: branchA.id, action: "cash.session.closed",
        entityId: session.id },
    }))).toBe(1);
    await expect(closeCashSession({ ...common, approverId: manager.id }))
      .rejects.toThrow("Matching open cash session is required");
  }, 90000);
});
