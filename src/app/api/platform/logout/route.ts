import { cookies } from "next/headers";
import { authJson, sameOriginMutation } from "@/server/auth-http";
import { platformCookieName, platformCookieOptions, platformLogout } from "@/server/platform-auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authJson({ error: "FORBIDDEN_ORIGIN" }, 403);
  try {
    await platformLogout((await cookies()).get(platformCookieName())?.value);
    const response = authJson({ ok: true });
    response.cookies.set(platformCookieName(), "", { ...platformCookieOptions(), maxAge: 0 });
    return response;
  } catch { return authJson({ error: "SERVICE_UNAVAILABLE" }, 503); }
}
