import { describe, expect, it } from "vitest";
import { reconcileDebtEntries } from "@/modules/debt/debt-reconciliation";

describe("multi-branch debt reconciliation", () => {
  it("reconciles cross-branch charges and collections in stored base currency", () => {
    expect(reconcileDebtEntries({openingBalance:"0", accountBalance:"60",
      entries:[
        {branchId:"A",kind:"CHARGE",amount:"100"},
        {branchId:"B",kind:"PAYMENT",amount:"40"},
      ]})).toEqual({
      reconciled:true, calculatedBalance:"60.0000",bookedBalance:"60.0000",
      difference:"0.0000",
      branchMovements:[{branchId:"A",netMovement:"100.0000"},{branchId:"B",netMovement:"-40.0000"}],
    });
  });
  it("flags a mismatch instead of showing an estimated balance", () => {
    const result=reconcileDebtEntries({openingBalance:0,accountBalance:77,
      entries:[{branchId:"A",kind:"CHARGE",amount:"80"}]});
    expect(result.reconciled).toBe(false);
    expect(result.difference).toBe("3.0000");
  });
  it("preserves decimal accuracy for fractional amounts", () => {
    expect(reconcileDebtEntries({openingBalance:0,accountBalance:"0.2",entries:[
      {branchId:"A",kind:"CHARGE",amount:"0.1"},
      {branchId:"A",kind:"CHARGE",amount:"0.1"},
    ]}).reconciled).toBe(true);
  });
  it("rejects missing branch and invalid amounts", () => {
    expect(() => reconcileDebtEntries({openingBalance:0,accountBalance:1,
      entries:[{branchId:"",kind:"CHARGE",amount:"1"}]})).toThrow("MISSING_BRANCH");
    expect(() => reconcileDebtEntries({openingBalance:0,accountBalance:1,
      entries:[{branchId:"A",kind:"CHARGE",amount:"-1"}]})).toThrow("INVALID_DEBT_ENTRY");
  });
});
