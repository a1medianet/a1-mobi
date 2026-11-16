-- Verification tokens are bound to the current recovery address and expire after 30 minutes.
CREATE TABLE "RecoveryEmailToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "deliveredAt" TIMESTAMP(3),
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecoveryEmailToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RecoveryEmailToken_tokenHash_key" ON "RecoveryEmailToken"("tokenHash");
CREATE INDEX "RecoveryEmailToken_userId_expiresAt_idx" ON "RecoveryEmailToken"("userId", "expiresAt");
ALTER TABLE "RecoveryEmailToken" ADD CONSTRAINT "RecoveryEmailToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
