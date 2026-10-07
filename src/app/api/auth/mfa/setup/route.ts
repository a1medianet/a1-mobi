import { z } from "zod";
import { readAuthJson } from "@/core/auth/request";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { beginMfaSetup } from "@/server/mfa-service";

export const runtime = "nodejs";
const schema = z.object({ currentPassword: z.string().min(1).max(256) }).strict();

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
    return authJson(await beginMfaSetup(context, input.data.currentPassword));
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      const response = authJson({ error: "RATE_LIMITED" }, 429);
      response.headers.set("Retry-After", "900");
      return response;
    }
    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      return authJson({ error: "INVALID_CREDENTIALS" }, 401);
    }
    if (error instanceof Error && error.message === "MFA_ALREADY_ENABLED") {
      return authJson({ error: "MFA_ALREADY_ENABLED" }, 409);
    }
    if (error instanceof Error && error.message === "MFA_KEY_NOT_CONFIGURED") {
      return authJson({ error: "SERVICE_UNAVAILABLE" }, 503);
    }
    return authJson({ error: "SERVICE_UNAVAILABLE" }, 503);
  }
}
