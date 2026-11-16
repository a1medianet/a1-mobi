-- Optional internal identity and verified-only notification routing. Existing users are preserved.
ALTER TABLE "User" ADD COLUMN "recoveryEmail" TEXT,
ADD COLUMN "recoveryEmailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "forwardNotifications" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "AccountHandle" (
  "handle" VARCHAR(30) NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountHandle_pkey" PRIMARY KEY ("handle")
);
CREATE UNIQUE INDEX "AccountHandle_userId_key" ON "AccountHandle"("userId");
ALTER TABLE "AccountHandle" ADD CONSTRAINT "AccountHandle_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
