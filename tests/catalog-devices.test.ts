import { describe, expect, it } from "vitest";
import { createInternalBarcode, normalizeBarcode } from "@/modules/catalog/barcode";
import { isValidImei, requireValidImei } from "@/modules/devices/imei";

describe("catalog and serialized devices", () => {
  it("normalizes scanner barcode input", () => {
    expect(normalizeBarcode("  A1-12345  ")).toBe("A1-12345");
  });

  it("creates deterministic internal barcodes", () => {
    expect(createInternalBarcode(42)).toBe("A1M-0000000042");
  });

  it("validates IMEI with the Luhn check", () => {
    expect(isValidImei("490154203237518")).toBe(true);
    expect(requireValidImei("490154-203237-518")).toBe("490154203237518");
    expect(isValidImei("490154203237519")).toBe(false);
  });
});