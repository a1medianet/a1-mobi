import { describe,expect,it } from "vitest";
import { currencyPreview,type ManualQuote } from "@/modules/currency/currency-preview";
import { safeCurrencyPolicy } from "@/modules/currency/currency-config";
const quotes:ManualQuote[]=[
  {base:"USD",quote:"LBP",rate:"89500",effectiveAt:"2026-11-13T08:00:00Z"},
  {base:"EUR",quote:"USD",rate:"1.1",effectiveAt:"2026-11-13T08:00:00Z"},
];
const convert=(amount:string,from:string,to:string,rates=quotes)=>currencyPreview({
  amount,from,to,baseCurrency:"USD",quotes:rates,
});
describe("A1 Currency cash converter — exact bilateral and cross-currency quotes",()=>{
  it("calculates USD → LBP immediately with exact cents",()=>{
    expect(convert("12.50","USD","LBP")).toBe("1118750");
  });
  it("calculates LBP → USD by inverting the same saved pair",()=>{
    expect(convert("1118750","LBP","USD")).toBe("12.50");
  });
  it("calculates EUR → LBP using audited USD bridge",()=>{
    expect(convert("10","EUR","LBP")).toBe("984500");
  });
  it("calculates LBP → EUR using the reciprocal bridge",()=>{
    expect(convert("984500","LBP","EUR")).toBe("10.00");
  });
  it("refuses missing rates rather than inventing market values",()=>{
    expect(()=>convert("10","USD","GBP")).toThrow("RATE_UNAVAILABLE");
  });
  it("rounds half up and rejects bad amounts and rates",()=>{
    expect(convert("0.01","USD","USD")).toBe("0.01");
    expect(convert("1.005","USD","USD")).toBe("1.01");
    expect(()=>convert("-1","USD","LBP")).toThrow("INVALID_DECIMAL");
    expect(()=>convert("1e20","USD","LBP")).toThrow("INVALID_DECIMAL");
  });
  it("requires valid nonzero rates for all quotes",()=>{
    expect(()=>convert("2","USD","LBP",[{...quotes[0],rate:"0"}])).toThrow("RATE_UNAVAILABLE");
  });
  it("defaults to ledger currency plus USD/LBP, never enabling EUR without owner setting",()=>{
    expect(safeCurrencyPolicy(null,"USD","ar").allowedCurrencies).toEqual(["USD","LBP"]);
  });
  it("respects preferred currency, country and locale while limiting unsupported currencies",()=>{
    const policy=safeCurrencyPolicy({
      allowedCurrencies:["EUR","SAR","XYZ","EUR"],preferredCurrency:"EUR",countryCode:"LB",preferredLocale:"en",
    },"USD","ar");
    expect(policy.allowedCurrencies).toEqual(["USD","LBP","EUR","SAR"]);
    expect(policy.countryCode).toBe("LB");
    expect(policy.preferredCurrency).toBe("EUR");
    expect(policy.preferredLocale).toBe("en");
  });
});
