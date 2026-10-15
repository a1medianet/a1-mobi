import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { demoStore, demoProducts } from "@/demo/data";

describe("A/B Arabic content visual gate", () => {
  it("has no UTF-8 mojibake in customer-facing sources", () => {
    for (const file of [
      "src/app/product/[locale]/page.tsx",
      "src/components/store-preview-controls.tsx",
      "src/demo/data.ts",
    ]) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source, file).not.toMatch(/[\u00d8\u00d9\u00c3\u00c2]|\u00e2\u20ac/u);
    }
  });

  it("retains real Arabic labels without requiring every product name to be translated", () => {
    const arabic = /[\u0600-\u06ff]/u;
    expect(demoStore.nameAr).toMatch(arabic);
    expect(demoProducts.some((product) => arabic.test(product.nameAr))).toBe(true);
    for (const product of demoProducts) expect(product.nameAr.trim().length).toBeGreaterThan(0);
  });
});
