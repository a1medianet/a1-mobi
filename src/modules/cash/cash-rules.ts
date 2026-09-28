export function toBase(amount: number, exchangeRate: number) {
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Cash amount is invalid");
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) throw new Error("Exchange rate must be positive");
  return round(amount / exchangeRate);
}

export function calculateExpectedCash(input: {
  openingUsd: number;
  openingLbp: number;
  openingExchangeRate: number;
  movements: Array<{ direction: "IN" | "OUT"; baseAmount: number }>;
}) {
  const openingBase = round(input.openingUsd + toBase(input.openingLbp, input.openingExchangeRate));
  return round(input.movements.reduce(
    (balance, movement) => balance + (movement.direction === "IN" ? movement.baseAmount : -movement.baseAmount),
    openingBase,
  ));
}

export function calculateClose(input: {
  expectedBase: number;
  physicalUsd: number;
  physicalLbp: number;
  closingExchangeRate: number;
  varianceReason?: string;
  approverId?: string;
}) {
  const physicalBase = round(input.physicalUsd + toBase(input.physicalLbp, input.closingExchangeRate));
  const varianceBase = round(physicalBase - input.expectedBase);
  if (Math.abs(varianceBase) > 0.0001 && (!input.varianceReason?.trim() || !input.approverId)) {
    throw new Error("Cash variance requires reason and approver");
  }
  return { physicalBase, varianceBase };
}

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}
