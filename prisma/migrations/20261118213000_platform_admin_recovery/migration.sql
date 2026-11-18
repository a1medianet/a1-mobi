-- A1 Login: separate Super Admin recovery identity. No email is implicitly verified.
ALTER TABLE "PlatformAdmin" ADD COLUMN "recoveryEmail" TEXT;
ALTER TABLE "PlatformAdmin" ADD COLUMN "recoveryEmailVerifiedAt" TIMESTAMP(3);

CREATE TYPE "PlatformRecoveryPurpose" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');

CREATE TABLE "PlatformRecoveryToken" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "purpose" "PlatformRecoveryPurpose" NOT NULL,
  "email" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "deliveredAt" TIMESTAMP(3),
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformRecoveryToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformRecoveryToken_tokenHash_key" ON "PlatformRecoveryToken"("tokenHash");
CREATE INDEX "PlatformRecoveryToken_adminId_purpose_expiresAt_idx" ON "PlatformRecoveryToken"("adminId","purpose","expiresAt");
ALTER TABLE "PlatformRecoveryToken" ADD CONSTRAINT "PlatformRecoveryToken_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "PlatformAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
