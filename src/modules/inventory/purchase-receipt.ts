export type ReceiptLine = {
  productId: string;
  quantity: number;
  unitCost: number;
  serializedDeviceIds?: readonly string[];
};

export function validateReceiptLine(line: ReceiptLine): ReceiptLine {
  if (!line.productId) throw new Error("PRODUCT_REQUIRED");
  if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
    throw new Error("INVALID_PURCHASE_QUANTITY");
  }
  if (!Number.isFinite(line.unitCost) || line.unitCost < 0) {
    throw new Error("INVALID_UNIT_COST");
  }
  if (
    line.serializedDeviceIds &&
    line.serializedDeviceIds.length !== line.quantity
  ) {
    throw new Error("SERIALIZED_COUNT_MISMATCH");
  }
  if (
    line.serializedDeviceIds &&
    new Set(line.serializedDeviceIds).size !== line.serializedDeviceIds.length
  ) {
    throw new Error("DUPLICATE_SERIALIZED_DEVICE");
  }
  return line;
}