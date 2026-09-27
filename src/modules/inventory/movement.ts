export type MovementType =
  | "PURCHASE_RECEIPT" | "SALE" | "RETURN" | "TRANSFER"
  | "REPAIR_USE" | "ADJUSTMENT" | "COUNT_VARIANCE";

export type StockMovementInput = {
  type: MovementType;
  quantity: number;
  fromLocationId?: string;
  toLocationId?: string;
  serializedDeviceId?: string;
  reason?: string;
  idempotencyKey: string;
};

export function validateStockMovement(input: StockMovementInput) {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error("INVALID_STOCK_QUANTITY");
  }
  if (!input.fromLocationId && !input.toLocationId) {
    throw new Error("STOCK_LOCATION_REQUIRED");
  }
  if (input.fromLocationId === input.toLocationId) {
    throw new Error("STOCK_LOCATIONS_MUST_DIFFER");
  }
  if (input.serializedDeviceId && input.quantity !== 1) {
    throw new Error("SERIALIZED_QUANTITY_MUST_BE_ONE");
  }
  if (["ADJUSTMENT", "COUNT_VARIANCE"].includes(input.type) && !input.reason) {
    throw new Error("STOCK_REASON_REQUIRED");
  }
  if (!input.idempotencyKey.trim()) throw new Error("IDEMPOTENCY_KEY_REQUIRED");
  return input;
}