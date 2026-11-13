import { describe, expect, it } from "vitest";
import { safeCsvCell, toExcelCsv } from "@/modules/engagement/safe-csv";

describe("safe customer spreadsheet export", () => {
  it("escapes delimiters, quotes and preserves Arabic Unicode", () => {
    expect(safeCsvCell('أحمد,"B"')).toBe('"أحمد,""B"""');
  });
  it("neutralizes spreadsheet formula starts including leading whitespace", () => {
    for (const value of ["=1+1", "+SUM(1)", "-2+3", "@SUM(1)", "  =cmd", "\t=1+1"]) {
      expect(safeCsvCell(value)).toContain("'"+value);
    }
  });
  it("emits Excel-compatible UTF-8 BOM and row separators", () => {
    expect(toExcelCsv([["Name", "Phone"], ["ليلى", "+9617000000"]]))
      .toBe('\uFEFF"Name","Phone"\r\n"ليلى","\'+9617000000"\r\n');
  });
});
