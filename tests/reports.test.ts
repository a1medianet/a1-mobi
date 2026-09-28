import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "@/modules/reports/csv";
import { createTextPdf } from "@/modules/reports/pdf";
import { validateProductImport } from "@/modules/reports/product-import";

describe("report import and export", () => {
  it("parses quoted CSV and exports escaped CSV", () => {
    expect(parseCsv('name,notes\r\n"Ali, Store","He said ""yes"""')).toEqual([
      ["name", "notes"],
      ["Ali, Store", 'He said "yes"'],
    ]);
    expect(toCsv([{ name: "Ali, Store", amount: 10 }])).toBe('name,amount\r\n"Ali, Store",10');
  });

  it("produces a valid PDF document", () => {
    const pdf = createTextPdf("Daily Owner Summary", ["Sales: 100", "Profit: 20"]);
    expect(pdf.subarray(0, 8).toString()).toBe("%PDF-1.4");
    expect(pdf.toString()).toContain("%%EOF");
  });

  it("validates product import columns and price floor", () => {
    const csv = [
      "category_code,sku,name_ar,name_en,type,barcode,cost,base_price,minimum_price,low_stock,serialized",
      "ACC,A-1,غطاء,Case,ACCESSORY,12345,2,5,3,1,false",
    ].join("\n");
    expect(validateProductImport(csv)[0]).toMatchObject({ sku: "A-1", basePrice: 5, serialized: false });
    expect(() => validateProductImport(csv.replace(",5,3,", ",3,5,"))).toThrow(/Minimum price/);
  });
});
