import { normalizeScan } from "@/modules/pilot/scanner";

export type ScanCartProduct = { id: string; sku: string; barcodes: readonly string[]; isSerialized: boolean };
export type ScanCartLine = { productId: string; quantity: number };
export function setCartQuantity(lines: readonly ScanCartLine[], productId: string, quantity: number): ScanCartLine[] {
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 10000) throw new Error("INVALID_QUANTITY");
  return lines.flatMap(line => line.productId === productId ? quantity === 0 ? [] : [{ ...line, quantity }] : [line]);
}
export function addScannedCartProduct(raw: string, products: readonly ScanCartProduct[], lines: readonly ScanCartLine[]): ScanCartLine[] {
  const code = normalizeScan(raw).toUpperCase();
  if (!code) throw new Error("SCAN_REQUIRED");
  const matches = products.filter(product => product.sku.toUpperCase() === code || product.barcodes.some(barcode => barcode.toUpperCase() === code));
  if (matches.length !== 1) throw new Error(matches.length ? "AMBIGUOUS_PRODUCT" : "PRODUCT_NOT_FOUND");
  const product = matches[0];
  if (product.isSerialized) throw new Error("USE_IMEI_CHECKOUT");
  const existing = lines.find(line => line.productId === product.id);
  if (existing) return setCartQuantity(lines, product.id, existing.quantity + 1);
  if (lines.length >= 50) throw new Error("CART_LIMIT");
  return [...lines, { productId: product.id, quantity: 1 }];
}
