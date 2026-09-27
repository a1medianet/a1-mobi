import { describe, expect, it } from "vitest";
import { DOMAIN_NAMES } from "@/core/config/domains";
import { resolveLocale, localeDirection } from "@/core/config/locales";
import { requireTenantContext } from "@/core/tenancy/context";
import { hasPermission } from "@/core/rbac/permissions";

describe("Stage 1 foundation", () => {
  it("locks all required domain boundaries", () => {
    expect(DOMAIN_NAMES).toEqual([
      "catalog", "devices", "inventory", "sell", "repair",
      "customers", "debt", "cash", "topup", "reports",
    ]);
  });

  it("supports Arabic RTL and English LTR", () => {
    expect(resolveLocale()).toBe("ar");
    expect(localeDirection.ar).toBe("rtl");
    expect(localeDirection.en).toBe("ltr");
  });

  it("rejects incomplete tenant context", () => {
    expect(() => requireTenantContext({ tenantId: "t1" })).toThrow();
  });

  it("does not grant missing permissions", () => {
    expect(hasPermission(["catalog.read"], "cost.read")).toBe(false);
  });
});