import { NextResponse } from "next/server";
import { turnstileEnabled } from "@/server/turnstile";
export const dynamic="force-dynamic";
export function GET(){
  const sitekey=process.env.A1_MOBI_TURNSTILE_SITE_KEY || "";
  const available=Boolean(sitekey && process.env.A1_MOBI_TURNSTILE_SECRET && process.env.A1_MOBI_TURNSTILE_HOSTNAME);
  return NextResponse.json({
    signup:turnstileEnabled("signup"),recovery:turnstileEnabled("recovery"),
    login:turnstileEnabled("login"),loginAlways:process.env.A1_MOBI_TURNSTILE_LOGIN_ALWAYS_ENABLED==="1",sitekey:available?sitekey:null,
  },{headers:{"Cache-Control":"no-store"}});
}
