import { NextResponse } from "next/server";
import { DOMAIN_NAMES, FOUNDATION_CAPABILITIES } from "@/core/config/domains";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "a1-mobi",
    stage: "9-pilot-software-ready",
    domains: DOMAIN_NAMES,
    capabilities: FOUNDATION_CAPABILITIES,
    timestamp: new Date().toISOString(),
  });
}