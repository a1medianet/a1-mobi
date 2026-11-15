CREATE TABLE "PlatformAdmin" (
 "id" TEXT NOT NULL,
 "email" TEXT NOT NULL,
 "passwordHash" TEXT NOT NULL,
 "totpSecretCipher" TEXT NOT NULL,
 "lastTotpCounter" INTEGER,
 "isActive" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformAdmin_email_key" ON "PlatformAdmin"("email");
CREATE TABLE "PlatformSession" (
 "id" TEXT NOT NULL,
 "adminId" TEXT NOT NULL,
 "tokenHash" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "revokedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PlatformSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformSession_tokenHash_key" ON "PlatformSession"("tokenHash");
CREATE INDEX "PlatformSession_adminId_expiresAt_idx" ON "PlatformSession"("adminId", "expiresAt");
ALTER TABLE "PlatformSession" ADD CONSTRAINT "PlatformSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "PlatformAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
