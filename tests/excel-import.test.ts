import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { productXlsxToCsv } from "@/modules/reports/excel-import";
import { validateProductImport } from "@/modules/reports/product-import";

const header = "category_code,sku,name_ar,name_en,type,barcode,cost,base_price,minimum_price,low_stock,serialized";
const row = "ACCESSORY,CASE001,غطاء,Case,ACCESSORY,BARCODE001,2,5,3,2,false";

describe("safe CSV and native XLSX product import", () => {
  it("reads a genuine zipped XLSX fixture while preserving Arabic names and text barcodes", async () => {
    const bytes = await readFile("tests/fixtures/catalog-import.xlsx");
    const csv = await productXlsxToCsv(bytes);
    expect(validateProductImport(csv)).toMatchObject([{
      categoryCode: "ACCESSORY", sku: "FIXTURE-001", nameAr: "غطاء تجربة",
      barcode: "FIXTURE0001", basePrice: 5, minimumPrice: 3,
    }]);
  });

  it("refuses forged, empty or oversized XLSX buffers", async () => {
    await expect(productXlsxToCsv(new Uint8Array())).rejects.toThrow("INVALID_IMPORT_SIZE");
    await expect(productXlsxToCsv(new TextEncoder().encode("not a spreadsheet"))).rejects.toThrow("INVALID_XLSX_FORMAT");
    await expect(productXlsxToCsv(new Uint8Array(1_000_001))).rejects.toThrow("INVALID_IMPORT_SIZE");
  });

  it("rejects duplicate SKU, duplicate barcode and malformed required values before writing", () => {
    expect(() => validateProductImport([header,row,row.replace("CASE001","CASE002")].join("\n"))).toThrow("Duplicate barcode");
    expect(() => validateProductImport([header,row,row.replace("BARCODE001","BARCODE002")].join("\n"))).toThrow("Duplicate SKU");
    expect(() => validateProductImport([header,row.replace("CASE001","")].join("\n"))).toThrow("Missing required");
    expect(() => validateProductImport([header,"ACCESSORY,CASE001"].join("\n"))).toThrow("Invalid column count");
    expect(() => validateProductImport([header,...Array(501).fill(row)].join("\n"))).toThrow("500 items");
  });
});
