import { describe, expect, it } from "vitest";
import { isValidImei, normalizeImei, requireValidImei } from "@/modules/devices/imei";

describe("IMEI input consistency across Arabic and English", () => {
  it("normalizes Arabic and Persian digits without changing device identity", () => {
    for (const imei of ["٣٥٢٠٩٩٠٠١٧٦١٤٨١", "۳۵۲۰۹۹۰۰۱۷۶۱۴۸۱", "٣٥٢٠٩٩-٠٠١٧٦١٤٨١"]) {
      expect(normalizeImei(imei)).toBe("352099001761481");
      expect(requireValidImei(imei)).toBe("352099001761481");
    }
  });
  it("rejects the zero placeholder and invalid checksums", () => {
    expect(isValidImei("000000000000000")).toBe(false);
    expect(isValidImei("352099001761482")).toBe(false);
  });
  it("does not strip letters to turn malformed input into a valid identity", () => {
    expect(isValidImei("x352099001761481")).toBe(false);
    expect(() => requireValidImei("IMEI:352099001761481")).toThrow("INVALID_IMEI");
  });
});
