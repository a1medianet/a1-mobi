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
    const cashIn = {
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      cashSessionId: session.id, direction: CashDirection.IN, type: CashMovementType.SALE,
      currency: "USD", amount: 50, exchangeRate: 1,
      sourceType: "Sale", sourceId: "sale-test", idempotencyKey: `cash-in-${suffix}`,
    };
    const firstIn = await recordCashMovement(cashIn);
    const replay = await recordCashMovement(cashIn);
    expect(replay.id).toBe(firstIn.id);
    await expect(recordCashMovement({ ...cashIn, amount: 60 }))
      .rejects.toThrow("Cash idempotency key conflict");
    expect(await db.cashMovement.count({ where: { cashSessionId: session.id, type: CashMovementType.SALE } }))
      .toBe(1);
    await recordCashMovement({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      cashSessionId: session.id, direction: CashDirection.OUT, type: CashMovementType.EXPENSE,
      currency: "LBP", amount: 1_790_000, exchangeRate: 89_500,
      reason: "Delivery", idempotencyKey: `cash-out-${suffix}`,
    });
    const closeInput = {
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      cashSessionId: session.id, physicalUsd: 130, physicalLbp: 8_950_000,
      closingExchangeRate: 89_500,
    };
    await expect(closeCashSession({ ...closeInput, physicalUsd: 129 }))
      .rejects.toThrow("Cash variance requires reason and approver");
    expect((await db.cashSession.findUniqueOrThrow({ where: { id: session.id } })).status)
      .toBe("OPEN");
    const closed = await closeCashSession(closeInput);
    await expect(closeCashSession(closeInput))
      .rejects.toThrow("Matching open cash session is required");
    await expect(recordCashMovement({ ...cashIn, idempotencyKey: `cash-post-close-${suffix}` }))
      .rejects.toThrow("Cash movement requires the matching open session");
    expect(await db.cashMovement.count({ where: { cashSessionId: session.id } }))
      .toBe(2);
    const audit = await db.auditEvent.findFirstOrThrow({
      where: { entityType: "CashSession", entityId: session.id, action: "cash.session.closed" },
    });

    expect(closed.status).toBe("CLOSED");
    expect(closed.expectedBase?.toNumber()).toBe(230);
    expect(closed.physicalBase?.toNumber()).toBe(230);
    expect(closed.varianceBase?.toNumber()).toBe(0);
    expect(audit.after).toMatchObject({ varianceBase: 0 });
  }, 30_000);

  it("serializes a concurrent cash movement and drawer close without losing ledger entries", async () => {
    const suffix = Date.now().toString();
    const tenant = await db.tenant.create({ data: { slug: `cash-race-${suffix}`, name: "Cash race UAT" } });
    const branch = await db.branch.create({ data: { tenantId: tenant.id, code: "MAIN", name: "Main" } });
    const actor = await db.user.create({ data: {
      tenantId: tenant.id, branchId: branch.id, email: `cash-race-${suffix}@example.test`,
      displayName: "Cash test actor", passwordHash: "test-only",
    } });
    const session = await openCashSession({
      tenantId: tenant.id, branchId: branch.id, actorId: actor.id,
      openingUsd: 10, openingLbp: 0, openingExchangeRate: 1,
    });
    const scope = { tenantId: tenant.id, branchId: branch.id, actorId: actor.id, cashSessionId: session.id };
    const [closeAttempt, movementAttempt] = await Promise.allSettled([
      closeCashSession({ ...scope, physicalUsd: 10, physicalLbp: 0, closingExchangeRate: 1 }),
      recordCashMovement({
        ...scope, direction: CashDirection.IN, type: CashMovementType.SALE,
        currency: "USD", amount: 5, exchangeRate: 1, idempotencyKey: `cash-race-in-${suffix}`,
      }),
    ]);
    const count = await db.cashMovement.count({ where: { cashSessionId: session.id } });
    expect(count).toBe(movementAttempt.status === "fulfilled" ? 1 : 0);
    if (closeAttempt.status === "rejected") {
      await closeCashSession({
        ...scope, physicalUsd: 10 + count * 5, physicalLbp: 0, closingExchangeRate: 1,
      });
    }
    const final = await db.cashSession.findUniqueOrThrow({ where: { id: session.id } });
    expect(final.status).toBe("CLOSED");
    expect(Number(final.expectedBase)).toBe(10 + 5 * count);
    await expect(recordCashMovement({
      ...scope, direction: CashDirection.IN, type: CashMovementType.SALE,
      currency: "USD", amount: 5, exchangeRate: 1, idempotencyKey: `cash-race-after-${suffix}`,
    })).rejects.toThrow("Cash movement requires the matching open session");
  }, 30_000);
});
