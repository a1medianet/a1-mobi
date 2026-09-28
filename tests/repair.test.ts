import { RepairStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  assertRepairTransition,
  calculateRepairTruth,
  validateIntake,
  validateRepairPart,
} from "@/modules/repairs/repair-rules";

describe("repair rules", () => {
  it("accepts the real repair workflow", () => {
    expect(() => assertRepairTransition(RepairStatus.INTAKE, RepairStatus.DIAGNOSIS)).not.toThrow();
    expect(() => assertRepairTransition(RepairStatus.IN_PROGRESS, RepairStatus.READY)).not.toThrow();
    expect(() => assertRepairTransition(RepairStatus.READY, RepairStatus.DELIVERED)).not.toThrow();
  });

  it("blocks workflow jumps", () => {
    expect(() => assertRepairTransition(RepairStatus.INTAKE, RepairStatus.DELIVERED)).toThrow(/Invalid/);
  });

  it("normalizes intake phone and requires all intake facts", () => {
    expect(validateIntake({
      customerName: "Ali",
      customerPhone: "+961 70 123 456",
      deviceDescription: "Phone",
      condition: "Scratched",
      reportedIssue: "No power",
    }).customerPhone).toBe("+96170123456");
    expect(() => validateIntake({
      customerName: "",
      customerPhone: "1234567",
      deviceDescription: "Phone",
      condition: "Good",
      reportedIssue: "No power",
    })).toThrow(/customerName/);
  });

  it("calculates repair profit truth from parts, labor and direct costs", () => {
    expect(calculateRepairTruth({
      finalPrice: 150,
      partCosts: [30, 10],
      laborCost: 25,
      directCost: 5,
      paidTotal: 50,
    })).toEqual({ partsCost: 40, totalCost: 70, profit: 80, balanceDue: 100 });
  });

  it("requires product and location for stock parts", () => {
    expect(() => validateRepairPart({
      source: "STOCK",
      quantity: 1,
      unitCost: 10,
    })).toThrow(/requires product and location/);
  });
});
