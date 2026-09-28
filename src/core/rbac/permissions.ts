export const PERMISSIONS = [
  "foundation.manage",
  "users.manage",
  "roles.manage",
  "audit.read",
  "feature-flags.manage",
  "catalog.read",
  "inventory.read",
  "sell.create",
  "repair.manage",
  "customers.read",
  "debt.manage",
  "cash.manage",
  "topup.manage",
  "reports.read",
  "cost.read",
  "profit.read",
  "device-trust.read",
  "device-trust.report",
  "device-trust.override",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function hasPermission(
  granted: readonly string[],
  required: Permission,
): boolean {
  return granted.includes(required);
}