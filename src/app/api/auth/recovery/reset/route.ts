import { z } from "zod";
import { readAuthJson } from "@/core/auth/request";
import { authJson, sameOriginMutation } from "@/server/auth-http";
import { resetPasswordWithToken } from "@/server/recovery-service";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().trim().min(40).max(80),
  newPassword: z.string().min(12).max(256),
}).strict();

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authJson({ error: "FORBIDDEN_ORIGIN" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return authJson({ error: "INVALID_REQUEST" }, 400);
  }

  try {
    const input = schema.safeParse(await readAuthJson(request));
    if (!input.success) return authJson({ error: "INVALID_REQUEST" }, 400);

    await resetPasswordWithToken(input.data.token, input.data.newPassword);
    return authJson({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      const response = authJson({ error: "RATE_LIMITED" }, 429);
      response.headers.set("Retry-After", "900");
      return response;
    }
    if (error instanceof Error &&
      (error.message === "INVALID_RESET_TOKEN" || error.message === "PASSWORD_TOO_SHORT")) {
      return authJson({ error: "INVALID_RESET_TOKEN" }, 400);
    }
    return authJson({ error: "SERVICE_UNAVAILABLE" }, 503);
  }
}
