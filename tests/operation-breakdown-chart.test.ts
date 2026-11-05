import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { demoTransactions } from "@/demo/data";
import { OperationBreakdownChart, operationBreakdown } from "@/components/operation-breakdown-chart";

describe("demo operation breakdown", () => {
  it("derives sample counts and exact shares, ignoring financial amounts", () => {
    expect(operationBreakdown(demoTransactions)).toEqual({ total: 5, categories: [
      { kind: "sale", count: 2, width: 40, share: 40 },
      { kind: "repair", count: 2, width: 40, share: 40 },
      { kind: "topup", count: 1, width: 20, share: 20 },
    ] });
    expect(operationBreakdown(demoTransactions.map(row => ({ ...row, amount: 0 })))).toEqual(operationBreakdown(demoTransactions));
  });
  it("handles no rows and absent categories without NaN or minimum bars", () => {
    const empty = operationBreakdown([]);
    expect(empty.total).toBe(0);
    expect(empty.categories.map(({ count, width, share }) => [count, width, share])).toEqual([[0,0,0],[0,0,0],[0,0,0]]);
    expect(operationBreakdown([{ kind: "repair" }]).categories.map(({ width, share }) => [width, share])).toEqual([[0,0],[100,100],[0,0]]);
  });
  it("keeps exact bar ratios while rounding displayed thirds deterministically to 100", () => {
    const result = operationBreakdown([{ kind: "sale" }, { kind: "repair" }, { kind: "topup" }]);
    for (const category of result.categories) expect(category.width).toBeCloseTo(100/3, 12);
    expect(result.categories.map(c => c.share)).toEqual([34,33,33]);
  });
  it("preserves counts, percentage sums and bounds across varied distributions", () => {
    for (let sale = 0; sale < 9; sale++) for (let repair = 0; repair < 9; repair++) for (let topup = 0; topup < 9; topup++) {
      const rows = (["sale", "repair", "topup"] as const).flatMap((kind, i) => Array.from({ length: [sale,repair,topup][i] }, () => ({ kind })));
      const { total, categories } = operationBreakdown(rows);
      expect(categories.reduce((sum, c) => sum+c.count, 0)).toBe(total);
      expect(categories.reduce((sum, c) => sum+c.share, 0)).toBe(total ? 100 : 0);
      for (const c of categories) {
        expect(c.width).toBe(total ? c.count/total*100 : 0);
        expect(c.share).toBeGreaterThanOrEqual(0);
        expect(c.share).toBeLessThanOrEqual(100);
        expect(Math.abs(c.share-c.width)).toBeLessThan(1);
      }
    }
  });
  it.each(["ar", "en"] as const)("renders accessible count text, demo status and explicit semantics in %s", locale => {
    const html = renderToStaticMarkup(createElement(OperationBreakdownChart, { rows: demoTransactions, locale }));
    for (const label of locale === "ar" ? ["بيع", "صيانة", "تعبئة", "بيانات تجريبية", "ليست إيرادات"] : ["Sale", "Repair", "Top-up", "Demo data", "not revenue"]) expect(html).toContain(label);
    expect(html).toContain(locale === "ar" ? "2 من 5" : "2 of 5");
    expect(html).toContain("(40%)");
    expect(html).toContain("(20%)");
    expect(html.match(/<li>/g)).toHaveLength(3);
    expect(html.match(/height:40%/g)).toHaveLength(2);
    expect(html).toContain("height:20%");
    expect(html).toContain(`dir="${locale === "ar" ? "rtl" : "ltr"}"`);
    expect(html).toContain('aria-describedby="operation-breakdown-caption"');
    expect(html).not.toContain("USD");
    expect(html).not.toContain("$");
    const empty = renderToStaticMarkup(createElement(OperationBreakdownChart, { rows: [], locale }));
    expect(empty).toContain(locale === "ar" ? "لا توجد عمليات" : "No demo operations");
    expect(empty.match(/height:0%/g)).toHaveLength(3);
    expect(empty).not.toMatch(/NaN|Infinity/);
  });
});
