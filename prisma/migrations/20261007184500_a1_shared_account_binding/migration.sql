ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "a1AccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "a1OrganizationId" TEXT,
  ADD COLUMN IF NOT EXISTS "billingTenantKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_billingTenantKey_key"
  ON "Tenant"("billingTenantKey");
