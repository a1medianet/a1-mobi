export const DOMAIN_NAMES = [
  "catalog",
  "devices",
  "inventory",
  "sell",
  "repair",
  "customers",
  "debt",
  "cash",
  "topup",
  "reports",
] as const;

export type DomainName = (typeof DOMAIN_NAMES)[number];

export const FOUNDATION_CAPABILITIES = [
  "auth",
  "tenancy",
  "rbac",
  "audit",
  "i18n",
  "featureFlags",
  "health",
  "logging",
] as const;