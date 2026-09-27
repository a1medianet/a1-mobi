export type TenantContext = {
  tenantId: string;
  branchId: string;
  userId: string;
};

export function requireTenantContext(
  context: Partial<TenantContext>,
): TenantContext {
  if (!context.tenantId || !context.branchId || !context.userId) {
    throw new Error("TENANT_CONTEXT_REQUIRED");
  }
  return context as TenantContext;
}