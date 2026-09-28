import { DeviceServiceContext, TopUpProviderMode } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { checkDeviceTrust } from "@/modules/device-trust/device-trust-service";
import { openCashSession } from "@/modules/cash/cash-service";
import { postTopUp, settleTopUpProvider } from "@/modules/topup/topup-service";

const runDb = process.env.DATABASE_URL ? describe : describe.skip;

runDb("top-up database integration", () => {
  it("posts a service without fake inventory and settles the provider", async () => {
    const suffix = Date.now().toString();
    const tenant = await db.tenant.create({ data: { slug: `topup-${suffix}`, name: "Stage 7 Test" } });
    const branch = await db.branch.create({ data: { tenantId: tenant.id, code: "MAIN", name: "Main" } });
    const user = await db.user.create({
      data: {
        tenantId: tenant.id, branchId: branch.id,
        email: `cashier-${suffix}@example.test`, displayName: "Cashier", passwordHash: "test-only",
      },
    });
    const provider = await db.topUpProvider.create({
      data: {
        tenantId: tenant.id, code: `ALFA-${suffix}`,
        name: "Alfa", mode: TopUpProviderMode.ON_ACCOUNT,
      },
    });
    const service = await db.topUpService.create({
      data: {
        tenantId: tenant.id, providerId: provider.id, code: `DATA-${suffix}`,
        nameAr: "باقة بيانات", nameEn: "Data Pack", defaultCost: 9, defaultSale: 10,
      },
    });
    const session = await openCashSession({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      openingUsd: 100, openingLbp: 0, openingExchangeRate: 89_500,
    });
    const trustCheck = await checkDeviceTrust({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      context: DeviceServiceContext.TOPUP_PRESENT, devicePresent: true,
      imei: "356938035643809",
    });
    const transaction = await postTopUp({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      cashSessionId: session.id, serviceId: service.id,
      customerPhone: "03123456", devicePresent: true,
      deviceImei: "356938035643809", trustCheckId: trustCheck.id,
      collectionCurrency: "LBP",
      collectionAmount: 895_000, exchangeRate: 89_500,
      idempotencyKey: `topup-${suffix}`,
    });
    const afterTopUp = await db.topUpProvider.findUniqueOrThrow({ where: { id: provider.id } });
    const settlement = await settleTopUpProvider({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      cashSessionId: session.id, providerId: provider.id,
      transactionIds: [transaction.id], number: `SET-${suffix}`,
      currency: "USD", amount: 9, exchangeRate: 1,
      idempotencyKey: `settlement-${suffix}`,
    });
    const afterSettlement = await db.topUpProvider.findUniqueOrThrow({ where: { id: provider.id } });
    const movements = await db.cashMovement.findMany({
      where: {
        OR: [
          { sourceType: "TopUpTransaction", sourceId: transaction.id },
          { sourceType: "ProviderSettlement", sourceId: settlement.id },
        ],
      },
      orderBy: { occurredAt: "asc" },
    });
    const stockMovements = await db.stockMovement.count({
      where: { referenceType: "TopUpTransaction", referenceId: transaction.id },
    });

    expect(transaction.profitBase.toNumber()).toBe(1);
    expect(afterTopUp.payableBalance.toNumber()).toBe(9);
    expect(afterSettlement.payableBalance.toNumber()).toBe(0);
    expect(movements.map((movement) => movement.direction)).toEqual(["IN", "OUT"]);
    expect(stockMovements).toBe(0);
  }, 30_000);
});
