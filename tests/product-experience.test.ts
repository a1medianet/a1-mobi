import { describe, expect, it } from "vitest";
import { demoCatalogCounts, demoProducts, demoTransactions } from "../src/demo/data";
import { demoCustomers, demoRepairs, demoTopups, demoInventoryMovements } from "../src/demo/operations";

describe("commercial product experience", () => {
  it("ships a populated realistic demo instead of an empty workspace", () => {
    const counts=demoCatalogCounts();
    expect(counts.total).toBeGreaterThanOrEqual(12);
    expect(counts.devices).toBeGreaterThanOrEqual(4);
    expect(counts.accessories).toBeGreaterThanOrEqual(4);
    expect(counts.parts).toBeGreaterThanOrEqual(2);
    expect(counts.serializedUnits).toBeGreaterThan(0);
    expect(demoTransactions.length).toBeGreaterThanOrEqual(5);
    expect(demoRepairs.length).toBeGreaterThanOrEqual(4);
    expect(demoCustomers.length).toBeGreaterThanOrEqual(5);
    expect(demoTopups.length).toBeGreaterThanOrEqual(3);
    expect(demoInventoryMovements.length).toBeGreaterThanOrEqual(4);
  });

  it("uses credible catalog records with retail identifiers and stock", () => {
    for (const product of demoProducts) {
      expect(product.sku.length).toBeGreaterThan(4);
      expect(product.barcode.length).toBeGreaterThan(5);
      expect(product.brand.length).toBeGreaterThan(1);
      expect(product.nameEn.length).toBeGreaterThan(5);
      expect(product.nameAr.length).toBeGreaterThan(5);
      expect(product.price).toBeGreaterThan(0);
      expect(product.stock).toBeGreaterThanOrEqual(0);
    }
  });

  it("contains serialized phones plus accessories and repair parts", () => {
    expect(demoProducts.some(p=>p.type==="DEVICE"&&p.serialized)).toBe(true);
    expect(demoProducts.some(p=>p.type==="ACCESSORY")).toBe(true);
    expect(demoProducts.some(p=>p.type==="PART")).toBe(true);
  });
});
