import { NextResponse } from "next/server";
import { DOMAIN_NAMES, FOUNDATION_CAPABILITIES } from "@/core/config/domains";
import { mfaConfigurationStatus } from "@/core/auth/totp";
import { db } from "@/server/db";
import { recoveryConfigurationStatus } from "@/server/recovery-service";
import { structuredLog } from "@/server/logger";
import { appVersionInfo } from "@/core/version";

export const runtime = "nodejs";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;

    const mfa = mfaConfigurationStatus();
    const recovery = recoveryConfigurationStatus();
    const productionReady = mfa.ready && recovery.ready;

    return NextResponse.json({
      status: productionReady ? "ok" : "degraded",
      service: "a1-mobi",
      stage: "foundation",
      version: appVersionInfo(),
      readiness: {
        database: "ready",
        mfaEncryption: mfa.encryptionKey,
        recoveryDelivery: recovery.delivery,
        billingCore: process.env.A1_BILLING_CORE_URL && process.env.A1_BILLING_SERVICE_TOKEN ? "configured" : "not_configured",
        pulseCore: process.env.A1_PULSE_CORE_URL && process.env.A1_PULSE_SERVICE_TOKEN ? "configured" : "not_configured",
        assist: process.env.A1_ASSIST_URL && process.env.A1_ASSIST_SERVICE_TOKEN ? "configured" : "not_configured",
      },
      domains: DOMAIN_NAMES,
      capabilities: FOUNDATION_CAPABILITIES,
      timestamp: new Date().toISOString(),
    }, {
      status: productionReady ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    structuredLog("error", "health.database_unavailable", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json({
      status: "degraded",
      service: "a1-mobi",
      stage: "foundation",
      readiness: { database: "unavailable" },
      timestamp: new Date().toISOString(),
    }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
