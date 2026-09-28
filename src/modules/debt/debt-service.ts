import { DebtEntryKind, PaymentMethod, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { paymentToBase } from "@/modules/sell/payments";
import { nextDebtBalance, requireDebtSource } from "./debt-rules";

export async function postDebtCharge(input: {
  tenantId: string;
  branchId: string;
  actorId: string;
  customerId: string;
  saleId?: string;
  repairOrderId?: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
}) {
  requireDebtSource(input.saleId, input.repairOrderId);
  return db.$transaction(async (tx) => {
    const existing = await tx.debtEntry.findUnique({
      where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey } },
    });
    if (existing) return existing;
    const [account, actor, branch] = await Promise.all([
      tx.debtAccount.findUniqueOrThrow({ where: { customerId: input.customerId } }),
      tx.user.findUniqueOrThrow({ where: { id: input.actorId } }),
      tx.branch.findUniqueOrThrow({ where: { id: input.branchId } }),
    ]);
    if ([account.tenantId, actor.tenantId, branch.tenantId].some((tenantId) => tenantId !== input.tenantId)) {
      throw new Error("Cross-tenant debt charge is forbidden");
    }
    if (input.saleId) {
      const sale = await tx.sale.findUniqueOrThrow({ where: { id: input.saleId } });
      if (sale.tenantId !== input.tenantId || sale.customerId !== input.customerId) {
        throw new Error("Sale does not belong to this customer");
      }
    }
    if (input.repairOrderId) {
      const repair = await tx.repairOrder.findUniqueOrThrow({ where: { id: input.repairOrderId } });
      if (repair.tenantId !== input.tenantId || repair.customerId !== input.customerId) {
        throw new Error("Repair does not belong to this customer");
      }
    }
    const balanceAfter = nextDebtBalance(Number(account.balance), DebtEntryKind.CHARGE, input.amount);
    const entry = await tx.debtEntry.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        debtAccountId: account.id,
        kind: DebtEntryKind.CHARGE,
        amount: input.amount,
        balanceAfter,
        saleId: input.saleId,
        repairOrderId: input.repairOrderId,
        reason: input.reason.trim(),
        idempotencyKey: input.idempotencyKey,
      },
    });
    await tx.debtAccount.update({ where: { id: account.id }, data: { balance: balanceAfter } });
    await tx.auditEvent.create({
      data: {
        tenantId: input.tenantId, branchId: input.branchId, actorId: actor.id,
        action: "debt.charge.posted", entityType: "DebtEntry", entityId: entry.id,
        after: { amount: input.amount, balanceAfter },
      },
    });
    return entry;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function recordDebtRepayment(input: {
  tenantId: string;
  branchId: string;
  actorId: string;
  customerId: string;
  method: PaymentMethod;
  currency: string;
  amount: number;
  exchangeRate: number;
  reference?: string;
  idempotencyKey: string;
}) {
  const baseAmount = paymentToBase(input);
  return db.$transaction(async (tx) => {
    const existing = await tx.debtEntry.findUnique({
      where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey } },
    });
    if (existing) return existing;
    const [account, actor] = await Promise.all([
      tx.debtAccount.findUniqueOrThrow({ where: { customerId: input.customerId } }),
      tx.user.findUniqueOrThrow({ where: { id: input.actorId } }),
    ]);
    if (account.tenantId !== input.tenantId || actor.tenantId !== input.tenantId) {
      throw new Error("Cross-tenant debt repayment is forbidden");
    }
    const balanceAfter = nextDebtBalance(Number(account.balance), DebtEntryKind.PAYMENT, baseAmount);
    const payment = await tx.payment.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        method: input.method,
        currency: input.currency.toUpperCase(),
        amount: input.amount,
        exchangeRate: input.exchangeRate,
        baseAmount,
        reference: input.reference,
      },
    });
    const entry = await tx.debtEntry.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        debtAccountId: account.id,
        kind: DebtEntryKind.PAYMENT,
        amount: baseAmount,
        balanceAfter,
        paymentId: payment.id,
        reason: "Debt repayment",
        idempotencyKey: input.idempotencyKey,
      },
    });
    await tx.debtAccount.update({ where: { id: account.id }, data: { balance: balanceAfter } });
    await tx.auditEvent.create({
      data: {
        tenantId: input.tenantId, branchId: input.branchId, actorId: actor.id,
        action: "debt.payment.posted", entityType: "DebtEntry", entityId: entry.id,
        after: { baseAmount, balanceAfter, currency: input.currency, exchangeRate: input.exchangeRate },
      },
    });
    return entry;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function getCustomerStatement(tenantId: string, customerId: string) {
  return db.debtAccount.findFirstOrThrow({
    where: { tenantId, customerId },
    include: {
      customer: true,
      entries: {
        orderBy: { occurredAt: "asc" },
        include: { payment: true, sale: { include: { invoice: true } }, repairOrder: true },
      },
    },
  });
}
