import { NextResponse } from "next/server";
import { appVersionInfo } from "@/core/version";

export function GET(){
  return NextResponse.json(appVersionInfo(),{headers:{"Cache-Control":"no-store"}});
}
