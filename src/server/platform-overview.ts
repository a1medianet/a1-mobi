import { db } from "./db";

/** Read-only, platform-scoped summary. Call only after currentPlatformAdmin() succeeds. */
export async function readPlatformOverview() {
  const [tenantCount, branchCount, userCount, tenants, activeSessions, recentAuditEvents, flaggedStores] = await Promise.all([
    db.tenant.count(),
    db.branch.count(),
    db.user.count(),
    db.platformSession.count({where:{revokedAt:null,expiresAt:{gt:new Date()}}}),
    db.auditEvent.count({where:{occurredAt:{gte:new Date(Date.now()-24*60*60*1000)}}}),
    db.featureFlag.count({where:{enabled:true}}),
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
  return { tenantCount, branchCount, userCount, tenants, activeSessions, recentAuditEvents, flaggedStores,
    hasMoreTenants: tenantCount > tenants.length,
    trialSignupEnabled: process.env.A1_MOBI_PUBLIC_TRIAL_ENABLED === "1",
    billingConfigured: Boolean(process.env.A1_BILLING_CORE_URL && process.env.A1_BILLING_SERVICE_TOKEN),
    recoveryDeliveryConfigured: Boolean(process.env.A1_MOBI_RECOVERY_WEBHOOK_URL && process.env.A1_MOBI_RECOVERY_WEBHOOK_SECRET && process.env.A1_MOBI_SMTP_HOST && process.env.A1_MOBI_SMTP_PASSWORD),
    rechargeSandboxEnabled: process.env.A1_MOBI_RECHARGE_ADAPTER_ENABLED === "true",
  };
}
