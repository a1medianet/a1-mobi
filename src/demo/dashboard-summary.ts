import { demoCatalogCounts, demoLowStock, demoTransactions } from "./data";
import { demoRepairs } from "./operations";

// Sample-only KPI source: sales are completed sale rows, not every demo operation.
export function demoDashboardSummary() {
  const sales = demoTransactions.filter(row => row.kind === "sale" && row.status === "COMPLETED");
  const salesUsd = sales.reduce((sum, row) => sum + row.amount, 0);
  const repairs = demoRepairs;
  const counts = demoCatalogCounts();
  return {
    sampleCount: demoTransactions.length,
    salesCount: sales.length,
    salesUsd,
    repairsCount: repairs.length,
    readyRepairs: repairs.filter(row => row.status === "READY").length,
    lowStockCount: demoLowStock().length,
    catalogCount: counts.total,
    serializedUnits: counts.serializedUnits,
  };
}
