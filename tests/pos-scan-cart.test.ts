import { describe, expect, it } from "vitest";
import { addScannedCartProduct, setCartQuantity } from "@/modules/sell/scan-cart";
const product = { id: "p1", sku: "CASE-01", barcodes: ["6281000000001"], isSerialized: false };
describe("POS stock scan cart", () => {
  it("accumulates barcode and SKU scans without mutating the draft", () => {
    const first = addScannedCartProduct(" 6281000000001\r\n", [product], []);
    expect(addScannedCartProduct("case-01", [product], first)).toEqual([{ productId: "p1", quantity: 2 }]);
    expect(first[0].quantity).toBe(1);
  });
  it("accepts registered numeric SKUs without treating them as IMEIs", () => {
    expect(addScannedCartProduct("123456789012345", [{ ...product, sku: "123456789012345" }], [])).toHaveLength(1);
  });
  it("rejects unknown, ambiguous and serialized matches", () => {
    expect(() => addScannedCartProduct("unknown", [product], [])).toThrow("PRODUCT_NOT_FOUND");
    expect(() => addScannedCartProduct(product.sku, [product, { ...product, id: "p2" }], [])).toThrow("AMBIGUOUS_PRODUCT");
    expect(() => addScannedCartProduct(product.sku, [{ ...product, isSerialized: true }], [])).toThrow("USE_IMEI_CHECKOUT");
  });
  it.each([-1, 1.5, NaN, Infinity, 10001])("rejects invalid quantity %s", quantity => {
    expect(() => setCartQuantity([{ productId: "p1", quantity: 1 }], "p1", quantity)).toThrow("INVALID_QUANTITY");
  });
  it("changes quantities and removes a line at zero", () => {
    const lines = [{ productId: "p1", quantity: 1 }];
    expect(setCartQuantity(lines, "p1", 3)).toEqual([{ productId: "p1", quantity: 3 }]);
    expect(setCartQuantity(lines, "p1", 0)).toEqual([]);
    expect(() => addScannedCartProduct(product.sku, [product], [{ productId: "p1", quantity: 10000 }])).toThrow("INVALID_QUANTITY");
  });
  it("limits distinct lines", () => {
    expect(() => addScannedCartProduct(product.sku, [product], Array.from({ length: 50 }, (_, i) => ({ productId: String(i), quantity: 1 })))).toThrow("CART_LIMIT");
  });
});
