-- CreateEnum
CREATE TYPE "TopUpProviderMode" AS ENUM ('IMMEDIATE', 'ON_ACCOUNT');

-- CreateEnum
CREATE TYPE "TopUpTransactionStatus" AS ENUM ('POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "ProviderSettlementStatus" AS ENUM ('POSTED', 'REVERSED');

-- CreateTable
CREATE TABLE "TopUpProvider" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "TopUpProviderMode" NOT NULL,
    "payableBalance" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopUpProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopUpService" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "defaultCost" DECIMAL(18,4) NOT NULL,
    "defaultSale" DECIMAL(18,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopUpService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopUpTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "settlementId" TEXT,
    "cashSessionId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "costBase" DECIMAL(18,4) NOT NULL,
    "saleBase" DECIMAL(18,4) NOT NULL,
    "profitBase" DECIMAL(18,4) NOT NULL,
    "collectionCurrency" TEXT NOT NULL,
    "collectionAmount" DECIMAL(18,4) NOT NULL,
    "exchangeRate" DECIMAL(18,6) NOT NULL,
    "status" "TopUpTransactionStatus" NOT NULL DEFAULT 'POSTED',
    "idempotencyKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopUpTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderSettlement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "cashSessionId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "amountBase" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "exchangeRate" DECIMAL(18,6) NOT NULL,
    "status" "ProviderSettlementStatus" NOT NULL DEFAULT 'POSTED',
    "idempotencyKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TopUpProvider_tenantId_code_key" ON "TopUpProvider"("tenantId", "code");

-- CreateIndex
CREATE INDEX "TopUpService_tenantId_providerId_idx" ON "TopUpService"("tenantId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "TopUpService_tenantId_code_key" ON "TopUpService"("tenantId", "code");

-- CreateIndex
CREATE INDEX "TopUpTransaction_tenantId_branchId_occurredAt_idx" ON "TopUpTransaction"("tenantId", "branchId", "occurredAt");

-- CreateIndex
CREATE INDEX "TopUpTransaction_providerId_settlementId_idx" ON "TopUpTransaction"("providerId", "settlementId");

-- CreateIndex
CREATE UNIQUE INDEX "TopUpTransaction_tenantId_idempotencyKey_key" ON "TopUpTransaction"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ProviderSettlement_tenantId_providerId_occurredAt_idx" ON "ProviderSettlement"("tenantId", "providerId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSettlement_tenantId_number_key" ON "ProviderSettlement"("tenantId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSettlement_tenantId_idempotencyKey_key" ON "ProviderSettlement"("tenantId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "TopUpProvider" ADD CONSTRAINT "TopUpProvider_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopUpService" ADD CONSTRAINT "TopUpService_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopUpService" ADD CONSTRAINT "TopUpService_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "TopUpProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopUpTransaction" ADD CONSTRAINT "TopUpTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopUpTransaction" ADD CONSTRAINT "TopUpTransaction_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopUpTransaction" ADD CONSTRAINT "TopUpTransaction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopUpTransaction" ADD CONSTRAINT "TopUpTransaction_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "TopUpProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopUpTransaction" ADD CONSTRAINT "TopUpTransaction_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "TopUpService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopUpTransaction" ADD CONSTRAINT "TopUpTransaction_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "ProviderSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSettlement" ADD CONSTRAINT "ProviderSettlement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSettlement" ADD CONSTRAINT "ProviderSettlement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSettlement" ADD CONSTRAINT "ProviderSettlement_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSettlement" ADD CONSTRAINT "ProviderSettlement_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "TopUpProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
