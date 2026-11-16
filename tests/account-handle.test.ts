import {describe, expect, it} from "vitest";
import {internalAccountAddress, normalizeAccountHandle} from "@/server/account-handle";

describe("A1 Mobi internal account handle", () => {
  it("normalizes the first merchant's requested name", () => {
    expect(normalizeAccountHandle(" TopMobile ")).toBe("topmobile");
    expect(internalAccountAddress(" TopMobile ")).toBe("topmobile@a1mobi.app");
  });
  it("rejects reserved identities", () => {
    for(const name of ["admin", "support", "billing", "security", "postmaster", "API"])
      expect(normalizeAccountHandle(name)).toBeNull();
  });
  it("rejects malformed names and fails closed", () => {
    for(const name of ["", "aa", "1topmobile", "top.mobile", "top-mobile", "top@other.com", "école", "a".repeat(31)])
      expect(normalizeAccountHandle(name)).toBeNull();
    expect(() => internalAccountAddress("admin")).toThrow("INVALID_ACCOUNT_HANDLE");
  });
});
