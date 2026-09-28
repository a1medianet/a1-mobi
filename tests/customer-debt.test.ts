import { DebtEntryKind } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { normalizePhone, validateCustomerName } from "@/modules/customers/customer-rules";
import { nextDebtBalance, requireDebtSource } from "@/modules/debt/debt-rules";

describe("customer and debt rules", () => {
  it("normalizes customer phones for duplicate prevention", () => {
    expect(normalizePhone("+961 70 123-456")).toBe("+96170123456");
    expect(normalizePhone("00961 70 123 456")).toBe("+96170123456");
  });

  it("requires a meaningful customer name", () => {
    expect(validateCustomerName(" Ali ")).toBe("Ali");
    expect(() => validateCustomerName(" ")).toThrow(/required/);
  });

  it("adds debt charges and subtracts partial payments", () => {
    expect(nextDebtBalance(20, DebtEntryKind.CHARGE, 80)).toBe(100);
    expect(nextDebtBalance(100, DebtEntryKind.PAYMENT, 30)).toBe(70);
  });

  it("blocks overpayment", () => {
    expect(() => nextDebtBalance(20, DebtEntryKind.PAYMENT, 21)).toThrow(/exceeds/);
  });

  it("requires exactly one source for a debt charge", () => {
    expect(() => requireDebtSource()).toThrow(/exactly one/);
    expect(() => requireDebtSource("sale", "repair")).toThrow(/exactly one/);
    expect(() => requireDebtSource("sale")).not.toThrow();
  });
});
