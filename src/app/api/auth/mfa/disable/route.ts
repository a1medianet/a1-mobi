import { z } from "zod";
import { readAuthJson } from "@/core/auth/request";
import {
  authJson, cookieOptions, currentStoreContext, sameOriginMutation, sessionCookieName,
} from "@/server/auth-http";
import { disableMfa } from "@/server/mfa-service";

export const runtime = "nodejs";
const schema = z.object({
  currentPassword: z.string().min(1).max(256),
  factor: z.string().trim().min(6).max(32),
}).strict();

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authJson({ error: "FORBIDDEN_ORIGIN" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return authJson({ error: "INVALID_REQUEST" }, 400);
  }
  try {
    const context = await currentStoreContext();
    if (!context) return authJson({ error: "AUTH_REQUIRED" }, 401);
    const input = schema.safeParse(await readAuthJson(request));
    if (!input.success) return authJson({ error: "INVALID_REQUEST" }, 400);
    await disableMfa(context, input.data.currentPassword, input.data.factor);
    const response = authJson({ ok: true });
    response.cookies.set(sessionCookieName(), "", { ...cookieOptions(), maxAge: 0 });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      const response = authJson({ error: "RATE_LIMITED" }, 429);
      response.headers.set("Retry-After", "900");
      return response;
    }
    if (error instanceof Error &&
      (error.message === "INVALID_MFA" || error.message === "INVALID_CREDENTIALS")) {
      return authJson({ error: error.message }, 401);
    }
    return authJson({ error: "SERVICE_UNAVAILABLE" }, 503);
  }
}
