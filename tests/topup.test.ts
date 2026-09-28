import { describe, expect, it } from "vitest";
import { assertSettlementAmount, priceTopUp } from "@/modules/topup/topup-rules";

describe("top-up rules", () => {
  it("calculates provider cost, sale, profit and margin", () => {
    expect(priceTopUp({ costBase: 9, saleBase: 10 })).toEqual({
      profitBase: 1,
      marginPercent: 10,
    });
  });

  it("blocks silent loss-making top-up", () => {
    expect(() => priceTopUp({ costBase: 11, saleBase: 10 })).toThrow(/explicit override/);
  });

  it("requires reason when loss override is used", () => {
    expect(() => priceTopUp({ costBase: 11, saleBase: 10, allowLoss: true })).toThrow(/explicit override/);
  });

  it("matches settlement to selected transactions", () => {
    expect(assertSettlementAmount([4, 5], 9)).toBe(9);
    expect(() => assertSettlementAmount([4, 5], 8)).toThrow(/does not match/);
  });
});
