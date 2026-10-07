import { describe, expect, it } from "vitest";
import { demoCatalogCounts, demoLowStock, demoProducts } from "@/demo/data";

describe("pilot demo experience", () => {
  it("ships a realistic catalog with unique identifiers and safe demo values", () => {
    expect(demoProducts.length).toBeGreaterThanOrEqual(10);
    expect(new Set(demoProducts.map(product => product.sku)).size).toBe(demoProducts.length);
    expect(new Set(demoProducts.map(product => product.barcode)).size).toBe(demoProducts.length);
    for (const product of demoProducts) {
      expect(product.nameAr.length).toBeGreaterThan(3);
      expect(product.nameEn.length).toBeGreaterThan(3);
      expect(product.price).toBeGreaterThan(0);
      expect(product.stock).toBeGreaterThanOrEqual(0);
      expect(product.reorderAt).toBeGreaterThanOrEqual(0);
      if (product.serialized) expect(product.type).toBe("DEVICE");
    }
  });

  it("derives catalog and low-stock metrics from the same source of truth", () => {
    const counts = demoCatalogCounts();
    expect(counts.total).toBe(demoProducts.length);
    expect(counts.devices + counts.accessories + counts.parts).toBe(counts.total);
    expect(counts.lowStock).toBe(demoLowStock().length);
    expect(counts.serializedUnits).toBeGreaterThan(0);
  });

  it("does not put private cost or margin fields in the general pilot catalog", () => {
    for (const product of demoProducts) {
      expect("cost" in product).toBe(false);
      expect("margin" in product).toBe(false);
      expect("minimumPrice" in product).toBe(false);
    }
  });
});
