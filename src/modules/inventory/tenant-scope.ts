export function assertSameTenant(
  contextTenantId: string,
  ...resourceTenantIds: string[]
): void {
  if (
    !contextTenantId ||
    resourceTenantIds.some((tenantId) => tenantId !== contextTenantId)
  ) {
    throw new Error("TENANT_SCOPE_VIOLATION");
  }
}