import { describe, expect, it } from "vitest";
import { formatDate, formatNumber } from "../src/core/config/number-format";
describe("ASCII number formatting", () => {
  for (const locale of ["ar", "en"] as const) {
    it(`keeps ${locale} dates in ASCII digits and Beirut time`, () => {
      const date = formatDate("2026-10-22T22:30:00Z", locale, {year:"numeric",month:"2-digit",day:"2-digit",numberingSystem:"arab",timeZone:"UTC"});
      expect(date).not.toMatch(/[٠-٩۰-۹]/);
      expect(date).toContain("23");
      expect(date).toContain("2026");
    });
    it(`keeps ${locale} amounts and quantities in ASCII digits`, () => {
      const amount = formatNumber(1234.5, locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      expect(amount).toMatch(/1.*234.*50/);
      expect(amount).not.toMatch(/[Ù -Ù©Û°-Û¹]/);
      expect(formatNumber(12, locale)).toBe("12");
      expect(formatNumber(12, locale, { numberingSystem: "arab" })).toBe("12");
    });
  }
});
