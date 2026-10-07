import { NextResponse } from "next/server";
import { DOMAIN_NAMES, FOUNDATION_CAPABILITIES } from "@/core/config/domains";
import { mfaConfigurationStatus } from "@/core/auth/totp";
import { appVersionInfo } from "@/core/version";
import { db } from "@/server/db";
import { recoveryConfigurationStatus } from "@/server/recovery-service";
import { structuredLog } from "@/server/logger";

export const runtime = "nodejs";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;

    const mfa = mfaConfigurationStatus();
    const recovery = recoveryConfigurationStatus();
    const billingReady=Boolean(process.env.A1_BILLING_CORE_URL && process.env.A1_BILLING_SERVICE_TOKEN);
    const pulseReady=Boolean(process.env.A1_PULSE_HEARTBEAT_URL && process.env.A1_PULSE_ERROR_URL && process.env.A1_PULSE_SERVICE_TOKEN && process.env.A1_TELEMETRY_HASH_SALT);
    const assistReady=Boolean(process.env.A1_ASSIST_ENDPOINT && process.env.A1_ASSIST_SERVICE_TOKEN);
    const sharedRequired=process.env.A1_SHARED_SERVICES_REQUIRED==="1";
    const sharedReady=billingReady&&pulseReady&&assistReady;
    const productionReady = mfa.ready && recovery.ready && (!sharedRequired || sharedReady);

    return NextResponse.json({
      status: productionReady ? "ok" : "degraded",
      service: "a1-mobi",
      stage: "foundation",
      version: appVersionInfo(),
      readiness: {
        database: "ready",
        mfaEncryption: mfa.encryptionKey,
        recoveryDelivery: recovery.delivery,
        billingCore: billingReady ? "configured" : "not_configured",
        pulseCore: pulseReady ? "configured" : "not_configured",
        assist: assistReady ? "configured" : "not_configured",
        sharedServicesRequired: sharedRequired,
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
      version: appVersionInfo(),
      readiness: { database: "unavailable" },
      timestamp: new Date().toISOString(),
    }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
