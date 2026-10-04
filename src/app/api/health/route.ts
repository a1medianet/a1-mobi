import { NextResponse } from "next/server";
import { DOMAIN_NAMES, FOUNDATION_CAPABILITIES } from "@/core/config/domains";
import { db } from "@/server/db";
import { structuredLog } from "@/server/logger";

export const runtime = "nodejs";
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      service: "a1-mobi",
      stage: "foundation",
      readiness: { database: "ready" },
      domains: DOMAIN_NAMES,
      capabilities: FOUNDATION_CAPABILITIES,
      timestamp: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
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
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
