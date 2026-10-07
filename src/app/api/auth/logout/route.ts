import { cookies } from "next/headers";
import { logoutSession } from "@/server/auth-service";
import { authJson, cookieOptions, sameOriginMutation, sessionCookieName } from "@/server/auth-http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authJson({ error: "FORBIDDEN_ORIGIN" }, 403);
  try {
    await logoutSession((await cookies()).get(sessionCookieName())?.value);
    const response = authJson({ ok: true });
    response.cookies.set(sessionCookieName(), "", { ...cookieOptions(), maxAge: 0 });
    return response;
  } catch { return authJson({ error: "SERVICE_UNAVAILABLE" }, 503); }
}
