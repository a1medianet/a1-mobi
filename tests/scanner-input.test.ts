import { describe, expect, it } from "vitest";
import { classifyScan, normalizeScan, selectScannedImei } from "@/modules/pilot/scanner";
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
  it("selects only available IMEI devices and rejects repeat counting", () => {
    const available=[{id:"device-1",imei:"490154203237518"}];
    const first=selectScannedImei("490154203237518\r\n",available,[]);
    expect(first).toEqual({deviceId:"device-1",selectedIds:["device-1"],changed:true});
    expect(selectScannedImei("490154203237518",available,first.selectedIds)).toEqual({
      deviceId:"device-1",selectedIds:["device-1"],changed:false,
    });
    expect(()=>selectScannedImei("5901234123457",available,[])).toThrow("IMEI_REQUIRED");
    expect(()=>selectScannedImei("490154203237518",[],[])).toThrow("DEVICE_NOT_AVAILABLE");
    expect(()=>selectScannedImei("490154203237518",available,["another"],1)).toThrow("INVOICE_DEVICE_LIMIT");
  });  it("rejects empty, malformed and impossible IMEI input", () => {
    expect(()=>classifyScan("  \r\n")).toThrow();
    expect(()=>classifyScan("490154203237519")).toThrow("Invalid IMEI checksum");
    expect(()=>classifyScan("490154203237519\r\n")).toThrow("Invalid IMEI checksum");
    expect(()=>classifyScan("bad code with spaces")).toThrow();
  });
});
