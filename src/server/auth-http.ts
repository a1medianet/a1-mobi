import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolveSessionContext } from "./session-context";
import { requireSessionPermission } from "@/core/auth/session-context";
import { SESSION_SECONDS } from "./auth-service";

export function sessionCookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-a1-mobi-session" : "a1-mobi-session";
}
export function cookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const, path: "/", maxAge: SESSION_SECONDS };
}
export function sameOriginMutation(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN ??
    (process.env.NODE_ENV !== "production" ? new URL(request.url).origin : undefined);
  if (!expected || !origin) return false;
  try { return new URL(origin).origin === new URL(expected).origin &&
    request.headers.get("sec-fetch-site") !== "cross-site"; }
  catch { return false; }
}
export function authJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
export async function currentStoreContext(permission?: string) {
  const token = (await cookies()).get(sessionCookieName())?.value;
  const context = await resolveSessionContext(token);
  return permission ? requireSessionPermission(context, permission) : context;
}
