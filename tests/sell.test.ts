import { describe, expect, it } from "vitest";
import { evaluatePrice } from "@/modules/sell/pricing";
import { paymentToBase, summarizePayments } from "@/modules/sell/payments";
import { priceSale, validateSaleLine } from "@/modules/sell/sale-rules";
import { requireReturnReason, validateReturnLine } from "@/modules/sell/return-rules";

describe("sell pricing and payment rules", () => {
  it("allows a normal price at or above the floor", () => {
    expect(evaluatePrice({
      basePrice: 100,
      minimumPrice: 90,
      finalPrice: 95,
      canOverrideFloor: false,
    })).toEqual({ deltaFromBase: -5, belowFloor: false, overrideRequired: false });
  });

  it("blocks a price below the floor without permission", () => {
    expect(() => evaluatePrice({
      basePrice: 100,
      minimumPrice: 90,
      finalPrice: 80,
      canOverrideFloor: false,
    })).toThrow(/requires permission/);
  });

  it("requires actor and reason for an approved floor override", () => {
    expect(() => evaluatePrice({
      basePrice: 100,
      minimumPrice: 90,
      finalPrice: 80,
      canOverrideFloor: true,
      overrideActorId: "owner",
    })).toThrow(/actor and reason/);
  });

  it("converts LBP to base currency using the historical rate", () => {
    expect(paymentToBase({ currency: "LBP", amount: 17_900_000, exchangeRate: 89_500 })).toBe(200);
  });

  it("supports mixed currency and partial payment", () => {
    expect(summarizePayments(600, [
      { currency: "USD", amount: 200, exchangeRate: 1 },
      { currency: "LBP", amount: 17_900_000, exchangeRate: 89_500 },
    ])).toEqual({ paidTotal: 400, balanceDue: 200, changeDue: 0, status: "PARTIALLY_PAID" });
  });

  it("requires one serialized device per serialized line", () => {
    expect(() => validateSaleLine({
      productId: "p1",
      stockLocationId: "l1",
      isSerialized: true,
      quantity: 2,
      basePrice: 100,
      minimumPrice: 90,
      finalPrice: 100,
      canOverrideFloor: false,
    })).toThrow(/quantity must equal one/);
  });

  it("prices a complete cart", () => {
    const result = priceSale([{
      productId: "p1",
      stockLocationId: "l1",
      isSerialized: false,
      quantity: 2,
      basePrice: 25,
      minimumPrice: 20,
      finalPrice: 24,
      canOverrideFloor: false,
    }], [{ currency: "USD", amount: 48, exchangeRate: 1 }]);
    expect(result.total).toBe(48);
    expect(result.status).toBe("COMPLETED");
  });

  it("prevents over-return and requires a reason", () => {
    expect(() => validateReturnLine({
      soldQuantity: 2,
      previouslyReturnedQuantity: 1,
      requestedQuantity: 2,
      soldUnitPrice: 10,
    })).toThrow(/exceeds/);
    expect(() => requireReturnReason(" ")).toThrow(/required/);
  });
});
