import { NextResponse } from "next/server";
import { DOMAIN_NAMES, FOUNDATION_CAPABILITIES } from "@/core/config/domains";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "a1-mobi",
    stage: "6-cash-currency",
    domains: DOMAIN_NAMES,
    capabilities: FOUNDATION_CAPABILITIES,
    timestamp: new Date().toISOString(),
  });
}