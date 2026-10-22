import { classifyScan } from "@/modules/pilot/scanner";
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
export type ReceiptScanProduct = { id: string; barcodes: readonly string[]; sku: string; isSerialized: boolean };
export function addScannedReceiptProduct(
  rawScan: string,
  products: readonly ReceiptScanProduct[],
  lines: readonly ReceiptLine[],
  unitCost: number,
): ReceiptLine[] {
  const scan=classifyScan(rawScan);
  if (scan.kind==="IMEI") throw new Error("SERIALIZED_RECEIVING_REQUIRES_DEVICE");
  const match=products.find(product =>
    product.sku.toUpperCase()===scan.value.toUpperCase() ||
    product.barcodes.some(barcode=>barcode.toUpperCase()===scan.value.toUpperCase()));
  if (!match) throw new Error("RECEIPT_PRODUCT_NOT_FOUND");
  if (match.isSerialized) throw new Error("SERIALIZED_RECEIVING_REQUIRES_DEVICE");
  if (!Number.isFinite(unitCost) || unitCost<0) throw new Error("INVALID_UNIT_COST");
  const existing=lines.find(line=>line.productId===match.id);
  if (!existing) return [...lines,validateReceiptLine({productId:match.id,quantity:1,unitCost})];
  if (existing.unitCost!==unitCost) throw new Error("RECEIPT_UNIT_COST_CONFLICT");
  const updated={...existing,quantity:existing.quantity+1};
  validateReceiptLine(updated);
  return lines.map(line=>line===existing?updated:line);
}