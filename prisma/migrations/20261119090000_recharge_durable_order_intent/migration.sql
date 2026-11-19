-- G5 private sandbox only. Intent is recorded before any external order POST.
CREATE TABLE "RechargeOrderIntent" (
 "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "branchId" TEXT NOT NULL,
 "actorId" TEXT NOT NULL, "quoteId" TEXT NOT NULL, "externalRef" TEXT NOT NULL,
 "idempotencyKey" TEXT NOT NULL, "recipientHash" TEXT NOT NULL,
 "requestHash" TEXT NOT NULL, "rechargeOrderId" TEXT, "orderState" TEXT,
 "orderVersion" INTEGER, "status" TEXT NOT NULL DEFAULT 'DISPATCHING',
 "reconciliationStatus" TEXT NOT NULL DEFAULT 'NEEDS_SOURCE_LOOKUP',
 "lastCheckedAt" TIMESTAMP(3), "financialRef" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "RechargeOrderIntent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RechargeOrderIntentAudit" (
 "id" TEXT NOT NULL, "intentId" TEXT NOT NULL, "action" TEXT NOT NULL,
 "details" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "RechargeOrderIntentAudit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RechargeIntent_scope_key_unique" ON "RechargeOrderIntent"("tenantId","branchId","idempotencyKey");
CREATE UNIQUE INDEX "RechargeIntent_scope_ref_unique" ON "RechargeOrderIntent"("tenantId","branchId","externalRef");
CREATE UNIQUE INDEX "RechargeIntent_scope_quote_unique" ON "RechargeOrderIntent"("tenantId","branchId","quoteId");
CREATE UNIQUE INDEX "RechargeIntent_scope_order_unique" ON "RechargeOrderIntent"("tenantId","branchId","rechargeOrderId");
-- Enforce a single unresolved outbound intent per actor under concurrent requests.
CREATE UNIQUE INDEX "RechargeIntent_one_unresolved_actor_idx" ON "RechargeOrderIntent"("tenantId","branchId","actorId") WHERE "status" IN ('DISPATCHING','OUTCOME_UNKNOWN');
CREATE INDEX "RechargeOrderIntent_tenantId_branchId_actorId_createdAt_idx" ON "RechargeOrderIntent"("tenantId","branchId","actorId","createdAt");
CREATE INDEX "RechargeOrderIntent_tenantId_branchId_status_idx" ON "RechargeOrderIntent"("tenantId","branchId","status");
CREATE INDEX "RechargeOrderIntentAudit_intentId_createdAt_idx" ON "RechargeOrderIntentAudit"("intentId","createdAt");
ALTER TABLE "RechargeOrderIntent" ADD CONSTRAINT "RechargeOrderIntent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RechargeOrderIntent" ADD CONSTRAINT "RechargeOrderIntent_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RechargeOrderIntent" ADD CONSTRAINT "RechargeOrderIntent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RechargeOrderIntentAudit" ADD CONSTRAINT "RechargeOrderIntentAudit_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "RechargeOrderIntent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
