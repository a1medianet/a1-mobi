import { DebtEntryKind } from "@prisma/client";

export function nextDebtBalance(balance: number, kind: DebtEntryKind, amount: number) {
  if (!Number.isFinite(balance) || balance < 0) throw new Error("Debt balance is invalid");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Debt amount must be positive");
  const debit = kind === DebtEntryKind.CHARGE || kind === DebtEntryKind.ADJUSTMENT_DEBIT;
  const next = debit ? balance + amount : balance - amount;
  if (next < 0) throw new Error("Debt repayment exceeds outstanding balance");
  return Math.round((next + Number.EPSILON) * 10_000) / 10_000;
}

export function requireDebtSource(saleId?: string, repairOrderId?: string) {
  if (Boolean(saleId) === Boolean(repairOrderId)) {
    throw new Error("Debt charge requires exactly one sale or repair source");
  }
}
