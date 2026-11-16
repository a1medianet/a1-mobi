/** Safe, non-owner staff roles used by new and existing A1 MOBI merchants. */
export const STAFF_ROLE_PRESETS = [
  { code: "manager", name: "Manager", permissions: [
    "catalog.read", "inventory.read", "sell.create", "sell.return", "repair.manage",
    "customers.read", "debt.manage", "cash.manage", "topup.manage", "reports.read",
    "cost.read", "profit.read", "device-trust.read",
  ] },
  { code: "cashier", name: "Cashier", permissions: [
    "catalog.read", "inventory.read", "sell.create", "customers.read", "topup.manage", "device-trust.read",
  ] },
  { code: "technician", name: "Repair technician", permissions: [
    "catalog.read", "inventory.read", "repair.manage", "customers.read", "device-trust.read",
  ] },
] as const;
