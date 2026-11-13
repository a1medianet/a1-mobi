import { Prisma } from "@prisma/client";

export type DebtLedgerLine = {
  branchId: string;
  kind: "CHARGE" | "PAYMENT" | "ADJUSTMENT_DEBIT" | "ADJUSTMENT_CREDIT";
  amount: string | number;
};

/** Reconcile persisted debt entries in account base currency, without currency conversion.
 * Cross-branch collections remain credited to the branch where recorded.
 * Never assume a branch's partial sum equals the customer's full balance.
 */
export function reconcileDebtEntries(input: {
  openingBalance: string | number;
  accountBalance: string | number;
  entries: readonly DebtLedgerLine[];
}) {
  const opening = new Prisma.Decimal(input.openingBalance);
  const booked = new Prisma.Decimal(input.accountBalance);
  if (!opening.isFinite() || !booked.isFinite() || opening.isNegative() || booked.isNegative())
    throw Error("INVALID_DEBT_BALANCE");
  const branches = new Map<string, Prisma.Decimal>();
  let net = opening;
  for (const line of input.entries) {
    if (!line.branchId.trim()) throw Error("MISSING_BRANCH");
    const amount = new Prisma.Decimal(line.amount);
    if (!amount.isFinite() || amount.lte(0)) throw Error("INVALID_DEBT_ENTRY");
    const signed = line.kind === "CHARGE" || line.kind === "ADJUSTMENT_DEBIT"
      ? amount : amount.negated();
    net = net.plus(signed);
    branches.set(line.branchId, (branches.get(line.branchId) ?? new Prisma.Decimal(0)).plus(signed));
  }
  return {
    reconciled: net.equals(booked),
    calculatedBalance: net.toFixed(4),
    bookedBalance: booked.toFixed(4),
    difference: net.minus(booked).toFixed(4),
    branchMovements: Array.from(branches, ([branchId, movement]) => ({
      branchId, netMovement: movement.toFixed(4),
    })),
  };
}
