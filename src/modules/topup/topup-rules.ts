export function priceTopUp(input: {
  costBase: number;
  saleBase: number;
  allowLoss?: boolean;
  lossReason?: string;
}) {
  if (![input.costBase, input.saleBase].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new Error("Top-up cost and sale must be non-negative");
  }
  const profitBase = round(input.saleBase - input.costBase);
  if (profitBase < 0 && (!input.allowLoss || !input.lossReason?.trim())) {
    throw new Error("Loss-making top-up requires explicit override and reason");
  }
  const marginPercent = input.saleBase === 0 ? 0 : round((profitBase / input.saleBase) * 100);
  return { profitBase, marginPercent };
}

export function assertSettlementAmount(transactionCosts: number[], amountBase: number) {
  if (!transactionCosts.length) throw new Error("Settlement requires transactions");
  const expected = round(transactionCosts.reduce((sum, value) => sum + value, 0));
  if (Math.abs(expected - amountBase) > 0.0001) {
    throw new Error("Settlement amount does not match selected transactions");
  }
  return expected;
}

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}
