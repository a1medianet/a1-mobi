import { z } from "zod";
import { readAuthJson } from "@/core/auth/request";
import { authJson, sameOriginMutation } from "@/server/auth-http";
import { platformLogin, platformCookieName, platformCookieOptions } from "@/server/platform-auth";
export const runtime = "nodejs";
const schema = z.object({ email: z.email().max(254), password: z.string().min(1).max(256) }).strict();
export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authJson({ error: "FORBIDDEN_ORIGIN" }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return authJson({ error: "INVALID_REQUEST" }, 400);
  try {
    const parsed = schema.safeParse(await readAuthJson(request));
    if (!parsed.success) return authJson({ error: "INVALID_REQUEST" }, 400);
    const token = await platformLogin(parsed.data.email, parsed.data.password);
    if (!token) return authJson({ error: "INVALID_CREDENTIALS" }, 401);
    const response = authJson({ ok: true });
    response.cookies.set(platformCookieName(), token, platformCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") return authJson({ error: "RATE_LIMITED" }, 429);
    return authJson({ error: "SERVICE_UNAVAILABLE" }, 503);
  }
}
