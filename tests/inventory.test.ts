import { describe, expect, it } from "vitest";
import { calculateLocationBalance, isLowStock } from "@/modules/inventory/balance";
import { validateStockMovement } from "@/modules/inventory/movement";
import { validateReceiptLine } from "@/modules/inventory/purchase-receipt";
import { assertSameTenant } from "@/modules/inventory/tenant-scope";

describe("inventory invariants", () => {
  it("calculates location balance from append-only movements", () => {
    const balance = calculateLocationBalance("main", [
      { quantity: 10, toLocationId: "main" },
      { quantity: 3, fromLocationId: "main", toLocationId: "repair" },
      { quantity: 1, toLocationId: "main" },
    ]);
    expect(balance).toBe(8);
    expect(isLowStock(balance, 8)).toBe(true);
  });

  it("requires a reason for adjustments", () => {
    expect(() => validateStockMovement({
      type: "ADJUSTMENT", quantity: 1, toLocationId: "main",
      idempotencyKey: "adjust-1",
    })).toThrow("STOCK_REASON_REQUIRED");
  });

  it("enforces one movement per serialized device", () => {
    expect(() => validateStockMovement({
      type: "PURCHASE_RECEIPT", quantity: 2, toLocationId: "main",
      serializedDeviceId: "imei-1", idempotencyKey: "receipt-1",
    })).toThrow("SERIALIZED_QUANTITY_MUST_BE_ONE");
  });
  it("matches serialized purchase quantity", () => {
    expect(() => validateReceiptLine({
      productId: "phone-1", quantity: 2, unitCost: 100,
      serializedDeviceIds: ["imei-1"],
    })).toThrow("SERIALIZED_COUNT_MISMATCH");
  });

  it("blocks cross-tenant inventory operations", () => {
    expect(() => assertSameTenant("tenant-a", "tenant-a", "tenant-b"))
      .toThrow("TENANT_SCOPE_VIOLATION");
  });
});