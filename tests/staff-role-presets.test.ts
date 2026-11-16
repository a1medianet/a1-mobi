import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/core/rbac/permissions";
import { STAFF_ROLE_PRESETS } from "@/core/rbac/staff-role-presets";
import { POST as createRole } from "@/app/api/admin/roles/route";
import { PATCH as editRole } from "@/app/api/admin/roles/[id]/route";

describe("merchant staff access separation", () => {
  it("only provides limited staff presets and never an owner preset", () => {
    expect(STAFF_ROLE_PRESETS.map(role => role.code)).toEqual(["manager", "cashier", "technician"]);
    const valid = new Set(PERMISSIONS);
    for (const role of STAFF_ROLE_PRESETS) {
      expect(role.permissions.every(code => valid.has(code))).toBe(true);
      expect(role.permissions).not.toContain("users.manage");
      expect(role.permissions).not.toContain("roles.manage");
      expect(role.permissions).not.toContain("foundation.manage");
      expect(role.permissions).not.toContain("feature-flags.manage");
      expect(role.permissions).not.toContain("device-trust.override");
    }
    expect(STAFF_ROLE_PRESETS.find(role => role.code === "cashier")?.permissions).not.toContain("cost.read");
    expect(STAFF_ROLE_PRESETS.find(role => role.code === "cashier")?.permissions).not.toContain("profit.read");
  });

  it("hides advanced role mutation APIs by default, including direct requests", async () => {
    const previous = process.env.A1_MOBI_MERCHANT_ADVANCED_ROLES_ENABLED;
    delete process.env.A1_MOBI_MERCHANT_ADVANCED_ROLES_ENABLED;
    try {
      const create = await createRole(new Request("https://mobi.example.test/api/admin/roles", { method: "POST" }));
      const change = await editRole(new Request("https://mobi.example.test/api/admin/roles/test-id", { method: "PATCH" }), { params: Promise.resolve({ id: "test-id" }) });
      expect(create.status).toBe(403);
      expect(change.status).toBe(403);
      expect((await create.json()).error).toBe("ADVANCED_ROLES_PLATFORM_ONLY");
      expect((await change.json()).error).toBe("ADVANCED_ROLES_PLATFORM_ONLY");
    } finally {
      if (previous === undefined) delete process.env.A1_MOBI_MERCHANT_ADVANCED_ROLES_ENABLED;
      else process.env.A1_MOBI_MERCHANT_ADVANCED_ROLES_ENABLED = previous;
    }
  });
});
