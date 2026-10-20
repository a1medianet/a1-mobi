-- Pilot checkout requests: no sale, payment, stock reservation or invoice.
ALTER TABLE "Branch" ADD COLUMN "publicStoreSlug" TEXT;
ALTER TABLE "Branch" ADD COLUMN "acceptingStoreOrders" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "Branch_publicStoreSlug_key" ON "Branch"("publicStoreSlug");

CREATE TABLE "StoreOrderRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "items" JSONB NOT NULL,
    "totalAmount" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StoreOrderRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StoreOrderRequest_tenantId_idempotencyKey_key" ON "StoreOrderRequest"("tenantId","idempotencyKey");
CREATE UNIQUE INDEX "StoreOrderRequest_tenantId_number_key" ON "StoreOrderRequest"("tenantId","number");
CREATE INDEX "StoreOrderRequest_tenantId_branchId_createdAt_idx" ON "StoreOrderRequest"("tenantId","branchId","createdAt");
ALTER TABLE "StoreOrderRequest" ADD CONSTRAINT "StoreOrderRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StoreOrderRequest" ADD CONSTRAINT "StoreOrderRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
