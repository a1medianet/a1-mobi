-- Sandbox Recharge events inbox only. No customer cash or supplier ledger writes.
CREATE TABLE "RechargeWebhookInbox" (
  "eventId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "rechargeOrderId" TEXT NOT NULL,
  "orderVersion" INTEGER NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "processingError" TEXT,
  CONSTRAINT "RechargeWebhookInbox_pkey" PRIMARY KEY ("eventId")
);
CREATE INDEX "RechargeWebhookInbox_tenantId_branchId_receivedAt_idx"
  ON "RechargeWebhookInbox"("tenantId", "branchId", "receivedAt");
CREATE INDEX "RechargeWebhookInbox_order_version_idx"
  ON "RechargeWebhookInbox"("merchantId", "rechargeOrderId", "orderVersion");
