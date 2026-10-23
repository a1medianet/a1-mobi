import { describe, expect, it } from "vitest";
import { formatNumber } from "../src/core/config/number-format";
describe("ASCII number formatting", () => {
  for (const locale of ["ar", "en"] as const) {
    it(`keeps ${locale} amounts and quantities in ASCII digits`, () => {
      const amount = formatNumber(1234.5, locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      expect(amount).toMatch(/1.*234.*50/);
      expect(amount).not.toMatch(/[٠-٩۰-۹]/);
      expect(formatNumber(12, locale)).toBe("12");
      expect(formatNumber(12, locale, { numberingSystem: "arab" })).toBe("12");
    });
  }
});
