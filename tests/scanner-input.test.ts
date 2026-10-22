import { describe, expect, it } from "vitest";
import { classifyScan, normalizeScan } from "@/modules/pilot/scanner";
import { createInternalBarcode, normalizeBarcode } from "@/modules/catalog/barcode";

describe("scanner input contract for POS and inventory", () => {
  it("strips common USB/Bluetooth scanner suffixes without losing identity", () => {
    expect(normalizeScan(" 490154203237518\r\n")).toBe("490154203237518");
    expect(classifyScan("490154203237518\t")).toEqual({kind:"IMEI",value:"490154203237518"});
  });
  it("distinguishes an EAN-13 barcode from an IMEI", () => {
    expect(classifyScan("5901234123457")).toEqual({kind:"EAN13",value:"5901234123457"});
  });
  it("classifies internal label and SKU as codes", () => {
    const code=createInternalBarcode(42);
    expect(classifyScan(code)).toEqual({kind:"CODE",value:code});
    expect(normalizeBarcode(code)).toBe(code);
    expect(classifyScan("APL-IP16P-256-BLK").kind).toBe("CODE");
  });
  it("rejects empty, malformed and impossible IMEI input", () => {
    expect(()=>classifyScan("  \r\n")).toThrow();
    expect(()=>classifyScan("490154203237519")).not.toThrow();
    expect(classifyScan("490154203237519").kind).toBe("CODE");
    expect(()=>classifyScan("bad code with spaces")).toThrow();
  });
});
