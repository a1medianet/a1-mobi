ALTER TABLE "MfaCredential" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "MfaRecoveryCode" (
  "id" TEXT NOT NULL,
  "credentialId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MfaRecoveryCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MfaRecoveryCode_credentialId_codeHash_key"
  ON "MfaRecoveryCode"("credentialId","codeHash");
CREATE INDEX "MfaRecoveryCode_credentialId_usedAt_idx"
  ON "MfaRecoveryCode"("credentialId","usedAt");

ALTER TABLE "MfaRecoveryCode"
  ADD CONSTRAINT "MfaRecoveryCode_credentialId_fkey"
  FOREIGN KEY ("credentialId") REFERENCES "MfaCredential"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "MfaRecoveryCode" ("id","credentialId","codeHash","createdAt")
SELECT
  'mrc_' || md5(credential."id" || ':' || code."codeHash"),
  credential."id",
  code."codeHash",
  CURRENT_TIMESTAMP
FROM "MfaCredential" AS credential
CROSS JOIN LATERAL jsonb_array_elements_text(credential."recoveryCodeHashes")
  AS code("codeHash")
ON CONFLICT DO NOTHING;

ALTER TABLE "MfaCredential" DROP COLUMN "recoveryCodeHashes";
