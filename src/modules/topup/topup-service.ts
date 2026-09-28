import {
  CashDirection,
  CashMovementType,
  CashSessionStatus,
  Prisma,
  TopUpProviderMode,
} from "@prisma/client";
import { db } from "@/server/db";
import { toBase } from "@/modules/cash/cash-rules";
import { assertSettlementAmount, priceTopUp } from "./topup-rules";

export async function postTopUp(input: {
  tenantId: string;
  branchId: string;
  actorId: string;
  cashSessionId: string;
  serviceId: string;
  customerPhone: string;
  costBase?: number;
  saleBase?: number;
  collectionCurrency: string;
  collectionAmount: number;
  exchangeRate: number;
  allowLoss?: boolean;
  lossReason?: string;
  idempotencyKey: string;
}) {
  return db.$transaction(async (tx) => {
    const existing = await tx.topUpTransaction.findUnique({
      where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey } },
    });
    if (existing) return existing;
    const [service, session, actor] = await Promise.all([
      tx.topUpService.findUniqueOrThrow({ where: { id: input.serviceId }, include: { provider: true } }),
      tx.cashSession.findUniqueOrThrow({ where: { id: input.cashSessionId } }),
      tx.user.findUniqueOrThrow({ where: { id: input.actorId } }),
    ]);
    if ([service.tenantId, session.tenantId, actor.tenantId].some((tenantId) => tenantId !== input.tenantId)
      || session.branchId !== input.branchId || session.status !== CashSessionStatus.OPEN) {
      throw new Error("Top-up requires matching tenant, branch, and open cash session");
    }
    const costBase = input.costBase ?? Number(service.defaultCost);
    const saleBase = input.saleBase ?? Number(service.defaultSale);
    const price = priceTopUp({
      costBase, saleBase, allowLoss: input.allowLoss, lossReason: input.lossReason,
    });
    const collectedBase = toBase(input.collectionAmount, input.exchangeRate);
    if (Math.abs(collectedBase - saleBase) > 0.0001) {
      throw new Error("Top-up collection does not match sale price");
    }

    const transaction = await tx.topUpTransaction.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        actorId: input.actorId,
        providerId: service.providerId,
        serviceId: service.id,
        cashSessionId: session.id,
        customerPhone: input.customerPhone.trim(),
        costBase,
        saleBase,
        profitBase: price.profitBase,
        collectionCurrency: input.collectionCurrency.toUpperCase(),
        collectionAmount: input.collectionAmount,
        exchangeRate: input.exchangeRate,
        idempotencyKey: input.idempotencyKey,
      },
    });
    await tx.cashMovement.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        cashSessionId: session.id,
        actorId: actor.id,
        direction: CashDirection.IN,
        type: CashMovementType.SALE,
        currency: input.collectionCurrency.toUpperCase(),
        amount: input.collectionAmount,
        exchangeRate: input.exchangeRate,
        baseAmount: collectedBase,
        sourceType: "TopUpTransaction",
        sourceId: transaction.id,
        idempotencyKey: `${input.idempotencyKey}:cash-in`,
      },
    });
    if (service.provider.mode === TopUpProviderMode.IMMEDIATE) {
      await tx.cashMovement.create({
        data: {
          tenantId: input.tenantId,
          branchId: input.branchId,
          cashSessionId: session.id,
          actorId: actor.id,
          direction: CashDirection.OUT,
          type: CashMovementType.TOPUP_SETTLEMENT,
          currency: "USD",
          amount: costBase,
          exchangeRate: 1,
          baseAmount: costBase,
          sourceType: "TopUpTransaction",
          sourceId: transaction.id,
          idempotencyKey: `${input.idempotencyKey}:provider-cost`,
        },
      });
    } else {
      await tx.topUpProvider.update({
        where: { id: service.providerId },
        data: { payableBalance: { increment: costBase } },
      });
    }
    await tx.auditEvent.create({
      data: {
        tenantId: input.tenantId, branchId: input.branchId, actorId: actor.id,
        action: "topup.transaction.posted", entityType: "TopUpTransaction", entityId: transaction.id,
        after: { providerId: service.providerId, costBase, saleBase, profitBase: price.profitBase },
      },
    });
    return transaction;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function settleTopUpProvider(input: {
  tenantId: string;
  branchId: string;
  actorId: string;
  cashSessionId: string;
  providerId: string;
  transactionIds: string[];
  number: string;
  currency: string;
  amount: number;
  exchangeRate: number;
  idempotencyKey: string;
}) {
  const amountBase = toBase(input.amount, input.exchangeRate);
  return db.$transaction(async (tx) => {
    const existing = await tx.providerSettlement.findUnique({
      where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey } },
    });
    if (existing) return existing;
    const [provider, session, actor, transactions] = await Promise.all([
      tx.topUpProvider.findUniqueOrThrow({ where: { id: input.providerId } }),
      tx.cashSession.findUniqueOrThrow({ where: { id: input.cashSessionId } }),
      tx.user.findUniqueOrThrow({ where: { id: input.actorId } }),
      tx.topUpTransaction.findMany({
        where: {
          id: { in: input.transactionIds },
          tenantId: input.tenantId,
          providerId: input.providerId,
          settlementId: null,
          status: "POSTED",
        },
      }),
    ]);
    if ([provider.tenantId, session.tenantId, actor.tenantId].some((tenantId) => tenantId !== input.tenantId)
      || session.branchId !== input.branchId || session.status !== CashSessionStatus.OPEN) {
      throw new Error("Settlement requires matching tenant, branch, and open cash session");
    }
    if (provider.mode !== TopUpProviderMode.ON_ACCOUNT) throw new Error("Immediate provider does not require settlement");
    if (transactions.length !== new Set(input.transactionIds).size) {
      throw new Error("Invalid or already settled top-up transaction");
    }
    assertSettlementAmount(transactions.map((transaction) => Number(transaction.costBase)), amountBase);

    const settlement = await tx.providerSettlement.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        actorId: actor.id,
        providerId: provider.id,
        cashSessionId: session.id,
        number: input.number,
        amountBase,
        currency: input.currency.toUpperCase(),
        amount: input.amount,
        exchangeRate: input.exchangeRate,
        idempotencyKey: input.idempotencyKey,
      },
    });
    await tx.topUpTransaction.updateMany({
      where: { id: { in: transactions.map((transaction) => transaction.id) } },
      data: { settlementId: settlement.id },
    });
    await tx.topUpProvider.update({
      where: { id: provider.id },
      data: { payableBalance: { decrement: amountBase } },
    });
    await tx.cashMovement.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        cashSessionId: session.id,
        actorId: actor.id,
        direction: CashDirection.OUT,
        type: CashMovementType.TOPUP_SETTLEMENT,
        currency: input.currency.toUpperCase(),
        amount: input.amount,
        exchangeRate: input.exchangeRate,
        baseAmount: amountBase,
        sourceType: "ProviderSettlement",
        sourceId: settlement.id,
        idempotencyKey: `${input.idempotencyKey}:cash-out`,
      },
    });
    return settlement;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
