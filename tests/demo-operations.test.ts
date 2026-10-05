import { describe, expect, it } from "vitest";
import {
  demoCash,
  demoCashMovements,
  demoCustomers,
  demoInventoryMovements,
  demoRepairs,
  demoReports,
  demoTopups,
} from "@/demo/operations";

describe("pilot operational demo data", () => {
  it("keeps synthetic operational references unique and financially coherent", () => {
    const refs = [
      ...demoCashMovements.map(item => item.ref),
      ...demoInventoryMovements.map(item => item.ref),
      ...demoTopups.map(item => item.ref),
      ...demoRepairs.map(item => item.number),
    ];
    expect(new Set(refs).size).toBe(refs.length);
    expect(demoCash.expectedUsd).toBe(demoCash.countedUsd);
    expect(demoCash.expectedLbp).toBe(demoCash.countedLbp);
    for (const repair of demoRepairs) {
      expect(repair.estimate).toBeGreaterThanOrEqual(repair.paid);
    }
    for (const transaction of demoTopups) {
      expect(transaction.sell).toBeGreaterThanOrEqual(transaction.cost);
    }
  });

  it("uses clearly synthetic customer contact data", () => {
    expect(demoCustomers.length).toBeGreaterThan(0);
    for (const customer of demoCustomers) {
      expect(customer.phone).toMatch(/000/);
      expect(customer.balance).toBeGreaterThanOrEqual(0);
      expect(customer.devices).toBeGreaterThan(0);
    }
  });

  it("keeps pilot report values non-negative and reconciled where declared", () => {
    for (const value of Object.values(demoReports)) expect(value).toBeGreaterThanOrEqual(0);
    expect(demoReports.cashVarianceUsd).toBe(0);
  });
});
