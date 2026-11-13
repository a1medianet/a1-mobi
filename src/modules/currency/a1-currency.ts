import { Prisma } from "@prisma/client";

/** Contract: one BASE unit buys RATE QUOTE units. Amounts use decimal arithmetic. */
export type CurrencyRate = {
  base: string; quote: string; rate: string;
  tenantId?: string; branchId?: string;
  mode: "MANUAL" | "AUTO"; source: string; effectiveAt: string; expiresAt?: string | null;
};
export type CurrencyPolicy = {
  baseCurrency: string; allowedCurrencies: string[];
  tenantId?: string; branchId?: string; countryCode?: string;
  mode: "MANUAL" | "AUTO"; provider?: string | null; maxAgeMinutes?: number;
};
export const currencyCode = (code: string) => {
  const result = code.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(result)) throw Error("INVALID_CURRENCY");
  return result;
};
function decimal(value: string | number) {
  if (typeof value === "number" && !Number.isFinite(value)) throw Error("INVALID_AMOUNT");
  const n = new Prisma.Decimal(value);
  if (!n.isFinite()) throw Error("INVALID_AMOUNT");
  return n;
}
function checkedRate(record: CurrencyRate, policy: CurrencyPolicy, at: Date) {
  const base = currencyCode(record.base), quote = currencyCode(record.quote);
  if (base === quote) throw Error("INVALID_RATE_PAIR");
  if (policy.tenantId && record.tenantId !== policy.tenantId) throw Error("CROSS_TENANT_RATE");
  if (policy.branchId && record.branchId !== policy.branchId) throw Error("CROSS_BRANCH_RATE");
  const rate = decimal(record.rate);
  if (rate.lte(0)) throw Error("INVALID_RATE");
  const allowed = new Set([...policy.allowedCurrencies, policy.baseCurrency].map(currencyCode));
  if (!allowed.has(base) || !allowed.has(quote)) throw Error("UNSUPPORTED_CURRENCY");
  if (record.mode !== policy.mode) throw Error("RATE_MODE_MISMATCH");
  if (record.mode === "AUTO" && (!policy.provider || record.source !== policy.provider)) throw Error("UNTRUSTED_PROVIDER");
  const start = Date.parse(record.effectiveAt);
  if (!Number.isFinite(start) || start > at.getTime()) throw Error("RATE_NOT_EFFECTIVE");
  if (record.expiresAt) {
    const end = Date.parse(record.expiresAt);
    if (!Number.isFinite(end) || end < at.getTime()) throw Error("RATE_EXPIRED");
  }
  if (record.mode === "AUTO") {
    const age = policy.maxAgeMinutes ?? 1440;
    if (!Number.isFinite(age) || age <= 0 || at.getTime() - start > age * 60_000) throw Error("STALE_RATE");
  }
  return rate;
}
/** Bidirectional and cross-pair conversion; no guessed or silently reused rates. */
export function convertCurrency(input: {
  amount: string | number; from: string; to: string;
  rates: CurrencyRate[]; policy: CurrencyPolicy; at?: Date; decimals?: number;
}) {
  const from = currencyCode(input.from), to = currencyCode(input.to), base = currencyCode(input.policy.baseCurrency);
  const allowed = new Set([...input.policy.allowedCurrencies, base].map(currencyCode));
  if (!allowed.has(from) || !allowed.has(to)) throw Error("UNSUPPORTED_CURRENCY");
  const amount = decimal(input.amount);
  if (amount.lt(0)) throw Error("INVALID_AMOUNT");
  const digits = input.decimals ?? (to === "LBP" ? 0 : 2);
  if (!Number.isInteger(digits) || digits < 0 || digits > 8) throw Error("INVALID_PRECISION");
  const at = input.at ?? new Date();
  const valid = input.rates.flatMap(record => {
    try { return [{...record, factor: checkedRate(record, input.policy, at)}]; }
    catch { return []; }
  });
  const direct = (a: string, b: string): Prisma.Decimal | null => {
    const exact = valid.find(r => currencyCode(r.base) === a && currencyCode(r.quote) === b);
    if (exact) return exact.factor;
    const inverse = valid.find(r => currencyCode(r.base) === b && currencyCode(r.quote) === a);
    return inverse ? new Prisma.Decimal(1).div(inverse.factor) : null;
  };
  let rate: Prisma.Decimal | null = from === to ? new Prisma.Decimal(1) : direct(from, to);
  if (!rate && from !== base && to !== base) {
    const first = direct(from, base), second = direct(base, to);
    rate = first && second ? first.mul(second) : null;
  }
  if (!rate) throw Error("RATE_UNAVAILABLE");
  return {
    from, to, amount: amount.toString(), rateUsed: rate.toString(),
    converted: amount.mul(rate).toDecimalPlaces(digits, Prisma.Decimal.ROUND_HALF_UP).toFixed(digits),
  };
}
