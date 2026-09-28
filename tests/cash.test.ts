import { describe, expect, it } from "vitest";
import { calculateClose, calculateExpectedCash, toBase } from "@/modules/cash/cash-rules";

describe("cash and currency rules", () => {
  it("converts LBP using the stored transaction rate", () => {
    expect(toBase(8_950_000, 89_500)).toBe(100);
  });

  it("calculates expected cash from opening and movements", () => {
    expect(calculateExpectedCash({
      openingUsd: 100,
      openingLbp: 8_950_000,
      openingExchangeRate: 89_500,
      movements: [
        { direction: "IN", baseAmount: 50 },
        { direction: "OUT", baseAmount: 20 },
      ],
    })).toBe(230);
  });

  it("closes a matching drawer without variance reason", () => {
    expect(calculateClose({
      expectedBase: 230,
      physicalUsd: 130,
      physicalLbp: 8_950_000,
      closingExchangeRate: 89_500,
    })).toEqual({ physicalBase: 230, varianceBase: 0 });
  });

  it("requires reason and approver for cash variance", () => {
    expect(() => calculateClose({
      expectedBase: 230,
      physicalUsd: 220,
      physicalLbp: 0,
      closingExchangeRate: 89_500,
    })).toThrow(/reason and approver/);
  });
});
