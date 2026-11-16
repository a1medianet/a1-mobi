import { afterEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { db } from "@/server/db";
import { rollbackProvisionedStore } from "@/server/bootstrap-service";

const state = vi.hoisted(() => ({ billingFails: false, billingKey: "" }));
vi.mock("@/server/billing-client", () => ({
  startMobiTrial: async (billingTenantKey: string) => {
    state.billingKey = billingTenantKey;
    if (state.billingFails) throw Error("A1_BILLING_UNAVAILABLE");
    return { tenantId: billingTenantKey, productKey: "mobi", planCode: "mobi-pilot",
      status: "trialing", features: { "mobi.users": "5", "mobi.branches": "1" },
      expiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString() };
  },
}));
import { onboardMobiTrial } from "@/server/trial-onboarding-service";

const parsed = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const isolated = parsed?.hostname === "127.0.0.1" && parsed.port === "55439" && parsed.pathname === "/mobi_platform_test";
const gate = isolated ? describe : describe.skip;
const slug = () => "merchant-gate-" + randomBytes(6).toString("hex");
const input = (tenantSlug: string) => ({ tenantSlug, tenantName: "Temporary Merchant Gate",
  branchCode: "MAIN", branchName: "Test Branch", ownerEmail: "merchant@invalid.example",
  ownerDisplayName: "Temporary Owner", ownerPassword: "TemporaryLongPasswordOnly123!",
  locale: "ar" as const });

gate("real isolated merchant trial provisioning with mocked Billing transport", () => {
  afterEach(() => { state.billingFails = false; state.billingKey = ""; });
  it("creates tenant, branch, owner and stable billing key, then cleans up", async () => {
    const tenantSlug = slug();
    let id: string | undefined;
    try {
      const result = await onboardMobiTrial(input(tenantSlug));
      id = result.tenantId;
      expect(result.entitlement.status).toBe("trialing");
      expect(result.billingTenantKey).toBe("mobi:" + id);
      expect(state.billingKey).toBe(result.billingTenantKey);
      const saved = await db.tenant.findUniqueOrThrow({ where: { id } });
      const branches = await db.branch.findMany({ where: { tenantId: id } });
      const users = await db.user.findMany({ where: { tenantId: id }, include: { userRoles: { include: { role: true } } } });
      expect(saved.slug).toBe(tenantSlug);
      expect(users).toHaveLength(1);
      expect(branches).toHaveLength(1);
      expect(users[0].tenantId).toBe(id);
      expect(users[0].userRoles[0].role.code).toBe("owner");
      expect(await db.platformAdmin.count()).toBe(0);
    } finally {
      if (id) await rollbackProvisionedStore(id);
      expect(await db.tenant.count({ where: { slug: tenantSlug } })).toBe(0);
    }
  }, 30_000);
  it("rolls back newly provisioned merchant when Billing cannot start trial", async () => {
    const tenantSlug = slug(); state.billingFails = true;
    await expect(onboardMobiTrial(input(tenantSlug))).rejects.toThrow("A1_BILLING_UNAVAILABLE");
    expect(await db.tenant.count({ where: { slug: tenantSlug } })).toBe(0);
  }, 30_000);
});
