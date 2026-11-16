import { db } from "./db";

/** Read-only, platform-scoped summary. Call only after currentPlatformAdmin() succeeds. */
export async function readPlatformOverview() {
  const [tenantCount, branchCount, userCount, tenants] = await Promise.all([
    db.tenant.count(),
    db.branch.count(),
    db.user.count(),
    db.tenant.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 50,
      select: {
        id: true, slug: true, name: true, defaultLocale: true,
        baseCurrency: true, billingTenantKey: true,
        _count: { select: { branches: true, users: true, products: true } },
      },
    }),
  ]);
  return { tenantCount, branchCount, userCount, tenants,
    hasMoreTenants: tenantCount > tenants.length,
    trialSignupEnabled: process.env.A1_MOBI_PUBLIC_TRIAL_ENABLED === "1",
    billingConfigured: Boolean(process.env.A1_BILLING_CORE_URL && process.env.A1_BILLING_SERVICE_TOKEN),
  };
}
