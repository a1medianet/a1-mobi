-- CreateEnum
CREATE TYPE "DeviceIncidentStatus" AS ENUM ('EVIDENCE_PENDING', 'REPORTED_LOST', 'REPORTED_STOLEN', 'VERIFIED_OWNER', 'POLICE_REPORT_VERIFIED', 'DISPUTED', 'FOUND', 'RETURNED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DeviceIncidentVisibility" AS ENUM ('STORE_ONLY', 'NETWORK');

-- CreateEnum
CREATE TYPE "DeviceServiceContext" AS ENUM ('PURCHASE', 'TRADE_IN', 'STOCK_IN', 'SALE', 'RETURN', 'REPAIR', 'TOPUP_PRESENT', 'DATA_TRANSFER', 'SETUP', 'OTHER');

-- CreateEnum
CREATE TYPE "DeviceTrustResult" AS ENUM ('CLEAR', 'REVIEW', 'MATCH', 'NOT_PRESENT', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "DeviceIncidentReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "imeiHash" TEXT NOT NULL,
    "imeiLast4" TEXT NOT NULL,
    "serialHash" TEXT,
    "status" "DeviceIncidentStatus" NOT NULL,
    "visibility" "DeviceIncidentVisibility" NOT NULL DEFAULT 'STORE_ONLY',
    "evidenceReference" TEXT,
    "policeReference" TEXT,
    "ownerContactRef" TEXT,
    "notes" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceIncidentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceTrustCheck" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "matchedReportId" TEXT,
    "overrideActorId" TEXT,
    "imeiHash" TEXT,
    "imeiLast4" TEXT,
    "context" "DeviceServiceContext" NOT NULL,
    "devicePresent" BOOLEAN NOT NULL DEFAULT true,
    "result" "DeviceTrustResult" NOT NULL,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceTrustCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeviceIncidentReport_imeiHash_status_visibility_idx" ON "DeviceIncidentReport"("imeiHash", "status", "visibility");

-- CreateIndex
CREATE INDEX "DeviceIncidentReport_tenantId_reportedAt_idx" ON "DeviceIncidentReport"("tenantId", "reportedAt");

-- CreateIndex
CREATE INDEX "DeviceTrustCheck_tenantId_branchId_checkedAt_idx" ON "DeviceTrustCheck"("tenantId", "branchId", "checkedAt");

-- CreateIndex
CREATE INDEX "DeviceTrustCheck_imeiHash_result_idx" ON "DeviceTrustCheck"("imeiHash", "result");

-- AddForeignKey
ALTER TABLE "DeviceIncidentReport" ADD CONSTRAINT "DeviceIncidentReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceIncidentReport" ADD CONSTRAINT "DeviceIncidentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceTrustCheck" ADD CONSTRAINT "DeviceTrustCheck_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceTrustCheck" ADD CONSTRAINT "DeviceTrustCheck_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceTrustCheck" ADD CONSTRAINT "DeviceTrustCheck_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceTrustCheck" ADD CONSTRAINT "DeviceTrustCheck_matchedReportId_fkey" FOREIGN KEY ("matchedReportId") REFERENCES "DeviceIncidentReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceTrustCheck" ADD CONSTRAINT "DeviceTrustCheck_overrideActorId_fkey" FOREIGN KEY ("overrideActorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
