import { describe, it, expect } from "vitest";
import { allowedProductVariants, matchesCatalogProductVariant } from "@/modules/inventory/variant-match";

describe("catalog product to IMEI variant safety", () => {
  const product = { sku: "GAL-S25-BLK-256", nameEn: "Galaxy S25 Ultra", categoryCode: "DEVICE" };
  const variants = [
    { id: "correct", name: "GAL-S25-BLK-256", model: "Galaxy S25 Ultra" },
    { id: "same-sku-wrong-model", name: "GAL-S25-BLK-256", model: "Galaxy S24 Ultra" },
    { id: "same-model-wrong-sku", name: "GAL-S25-BLU-256", model: "Galaxy S25 Ultra" },
  ];
  it("limits new catalog products to their exact model and SKU", () => {
    expect(allowedProductVariants(product, variants).map(item => item.id)).toEqual(["correct"]);
    expect(matchesCatalogProductVariant(product, variants[1])).toBe(false);
    expect(matchesCatalogProductVariant(product, variants[2])).toBe(false);
  });
  it("does not offer variants before a product is selected", () => {
    expect(allowedProductVariants(undefined, variants)).toEqual([]);
  });
  it("keeps the legacy phones pathway backward-compatible", () => {
    expect(allowedProductVariants({ ...product, categoryCode: "PHONES" }, variants)).toHaveLength(3);
  });
});
