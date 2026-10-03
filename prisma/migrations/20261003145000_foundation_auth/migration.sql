CREATE TABLE "AuthAttempt" (
  "key" TEXT NOT NULL, "attempts" INTEGER NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthAttempt_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "AuthAttempt_windowStart_idx" ON "AuthAttempt"("windowStart");
