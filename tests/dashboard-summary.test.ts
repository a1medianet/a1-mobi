import { describe, expect, it } from "vitest";
import { demoDashboardSummary } from "../src/demo/dashboard-summary";
import { demoTransactions } from "../src/demo/data";

describe("demo dashboard source consistency", () => {
  it("counts only sale rows as sales", () => {
    const summary = demoDashboardSummary();
    const completedSales = demoTransactions.filter(row => row.kind === "sale" && row.status === "COMPLETED");
    expect(summary.salesCount).toBe(completedSales.length);
    expect(summary.salesUsd).toBe(completedSales.reduce((total,row) => total + row.amount,0));
  });
  it("uses the same operation sample grain as the chart", () => {
    const summary=demoDashboardSummary();
    expect(summary.sampleCount).toBe(demoTransactions.length);
    expect(summary.sampleCount).toBe(summary.salesCount + demoTransactions.filter(row=>row.kind!=="sale").length);
  });
  it("reconciles sample product counts with serialized units and low stock", () => {
    const summary=demoDashboardSummary();
    expect(summary.catalogCount).toBe(12);
    expect(summary.serializedUnits).toBe(16);
    expect(summary.lowStockCount).toBe(3);
  });
});
