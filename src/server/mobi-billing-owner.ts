import { db } from "@/server/db";
import { currentStoreContext } from "@/server/auth-http";

/** Always derive tenant identity from the authenticated session, never the browser. */
export async function requireBillingOwner() {
  const context = await currentStoreContext();
  if (!context) throw new Error("AUTH_REQUIRED");
  const [tenant, owner] = await Promise.all([
    db.tenant.findUnique({
      where: { id: context.tenantId },
      select: { id: true, billingTenantKey: true },
    }),
    db.user.findFirst({
      where: {
        id: context.actorId, tenantId: context.tenantId, isActive: true,
        userRoles: { some: { role: { tenantId: context.tenantId, code: "owner" } } },
      },
      select: { id: true, email: true },
    }),
  ]);
  if (!tenant || !owner) throw new Error("PERMISSION_DENIED");
  // Preserve existing Billing subscriptions keyed by a persisted legacy value.
  // Newly provisioned tenants use the immutable internal tenant id.
  const billingTenantKey = tenant.billingTenantKey || "mobi:" + tenant.id;
  return { context, tenantId: tenant.id, billingTenantKey, email: owner.email };
}
