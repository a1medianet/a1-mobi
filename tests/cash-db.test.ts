import { CashDirection, CashMovementType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import {
  closeCashSession,
  openCashSession,
  recordCashMovement,
  setExchangeRate,
} from "@/modules/cash/cash-service";

const runDb = process.env.DATABASE_URL ? describe : describe.skip;

runDb("cash database integration", () => {
  it("opens, records dual-currency movements, and closes a matched drawer", async () => {
    const suffix = Date.now().toString();
    const tenant = await db.tenant.create({ data: { slug: `cash-${suffix}`, name: "Stage 6 Test" } });
    const branch = await db.branch.create({ data: { tenantId: tenant.id, code: "MAIN", name: "Main" } });
    const user = await db.user.create({
      data: {
        tenantId: tenant.id, branchId: branch.id,
        email: `cashier-${suffix}@example.test`, displayName: "Cashier", passwordHash: "test-only",
      },
    });
    const rate = await setExchangeRate({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id, rate: 89_500,
    });
    const session = await openCashSession({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      openingUsd: 100, openingLbp: 8_950_000, openingExchangeRate: Number(rate.rate),
    });
    await recordCashMovement({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      cashSessionId: session.id, direction: CashDirection.IN, type: CashMovementType.SALE,
      currency: "USD", amount: 50, exchangeRate: 1,
      sourceType: "Sale", sourceId: "sale-test", idempotencyKey: `cash-in-${suffix}`,
    });
    await recordCashMovement({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      cashSessionId: session.id, direction: CashDirection.OUT, type: CashMovementType.EXPENSE,
      currency: "LBP", amount: 1_790_000, exchangeRate: 89_500,
      reason: "Delivery", idempotencyKey: `cash-out-${suffix}`,
    });
    const closed = await closeCashSession({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      cashSessionId: session.id, physicalUsd: 130, physicalLbp: 8_950_000,
      closingExchangeRate: 89_500,
    });
    const audit = await db.auditEvent.findFirstOrThrow({
      where: { entityType: "CashSession", entityId: session.id, action: "cash.session.closed" },
    });

    expect(closed.status).toBe("CLOSED");
    expect(closed.expectedBase?.toNumber()).toBe(230);
    expect(closed.physicalBase?.toNumber()).toBe(230);
    expect(closed.varianceBase?.toNumber()).toBe(0);
    expect(audit.after).toMatchObject({ varianceBase: 0 });
  }, 30_000);
});
