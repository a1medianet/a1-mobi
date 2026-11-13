import { describe, expect, it } from "vitest";
import { convertCurrency, type CurrencyPolicy, type CurrencyRate } from "@/modules/currency/a1-currency";

const at = new Date("2026-11-13T10:00:00Z");
const usdLbp: CurrencyRate = { base: "USD", quote: "LBP", rate: "89500", mode: "MANUAL",
  source: "branch-owner", effectiveAt: "2026-11-12T10:00:00Z" };
const manual: CurrencyPolicy = { baseCurrency: "USD", allowedCurrencies: ["USD", "LBP", "EUR"], mode: "MANUAL" };
const convert = (amount: string, from: string, to: string, rates = [usdLbp], policy = manual) =>
  convertCurrency({amount, from, to, rates, policy, at});

describe("A1 Currency contract (manual, provider, bidirectional, historical)", () => {
  it("never accepts exchange rates from another tenant or branch", () => {
    const policy: CurrencyPolicy = {...manual, tenantId:"customer-a", branchId:"tripoli"};
    expect(() => convert("1","USD","LBP",
      [{...usdLbp,tenantId:"customer-b",branchId:"tripoli"}],policy)).toThrow("RATE_UNAVAILABLE");
    expect(() => convert("1","USD","LBP",
      [{...usdLbp,tenantId:"customer-a",branchId:"beirut"}],policy)).toThrow("RATE_UNAVAILABLE");
    expect(convert("1","USD","LBP",
      [{...usdLbp,tenantId:"customer-a",branchId:"tripoli"}],policy).converted).toBe("89500");
  });
  it("converts USD to LBP without floating point drift", () => {
    expect(convert("12.50", "USD", "LBP").converted).toBe("1118750");
  });
  it("converts back LBP to USD using exact inverse", () => {
    expect(convert("1118750", "LBP", "USD").converted).toBe("12.50");
  });
  it("crosses EUR to LBP via base USD", () => {
    const eurUsd: CurrencyRate = { ...usdLbp, base: "EUR", quote: "USD", rate: "1.1" };
    expect(convert("10", "EUR", "LBP", [usdLbp, eurUsd]).converted).toBe("984500");
  });
  it("rejects unsupported currencies", () => {
    expect(() => convert("1", "USD", "GBP")).toThrow("UNSUPPORTED_CURRENCY");
  });
  it("never silently converts when rate is missing", () => {
    expect(() => convert("2", "USD", "EUR")).toThrow("RATE_UNAVAILABLE");
  });
  it("keeps stale automatic feeds out of commercial transactions", () => {
    const provider: CurrencyRate = {...usdLbp, mode:"AUTO", source:"vendor", effectiveAt:"2026-11-11T09:00:00Z"};
    const p: CurrencyPolicy = {...manual, mode:"AUTO", provider:"vendor", maxAgeMinutes:120};
    expect(() => convert("1", "USD", "LBP", [provider], p)).toThrow("RATE_UNAVAILABLE");
  });
  it("requires the selected provider and does not accept manual rates during AUTO", () => {
    const p: CurrencyPolicy = {...manual, mode:"AUTO", provider:"vendor"};
    expect(() => convert("1", "USD", "LBP", [usdLbp], p)).toThrow("RATE_UNAVAILABLE");
  });
  it("uses a valid automatic rate when source is verified by policy", () => {
    const p: CurrencyPolicy = {...manual, mode:"AUTO", provider:"vendor", maxAgeMinutes:90};
    const rate: CurrencyRate = {...usdLbp, mode:"AUTO", source:"vendor", effectiveAt:"2026-11-13T09:45:00Z"};
    expect(convert("1", "USD", "LBP", [rate], p).converted).toBe("89500");
  });
  it("rejects expired and future-effective quotes", () => {
    expect(() => convert("1", "USD", "LBP", [{...usdLbp, expiresAt:"2026-11-13T09:00:00Z"}])).toThrow("RATE_UNAVAILABLE");
    expect(() => convert("1", "USD", "LBP", [{...usdLbp, effectiveAt:"2026-11-14T09:00:00Z"}])).toThrow("RATE_UNAVAILABLE");
  });
  it("uses identity conversion only for the same permitted currency", () => {
    expect(convert("17.5","USD","USD",[]).converted).toBe("17.50");
  });
});
