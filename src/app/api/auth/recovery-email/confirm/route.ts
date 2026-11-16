import { z } from "zod";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { confirmRecoveryEmailVerification } from "@/server/recovery-email-verification";
import { AttemptBudgetExceeded } from "@/server/attempt-budget";

export const runtime = "nodejs";
const schema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict();
export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authJson({ error: "FORBIDDEN_ORIGIN" }, 403);
  const context = await currentStoreContext();
  if (!context) return authJson({ error: "AUTH_REQUIRED" }, 401);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return authJson({ error: "INVALID_REQUEST" }, 400);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return authJson({ error: "INVALID_REQUEST" }, 400);
  try {
    return authJson(await confirmRecoveryEmailVerification({
      userId: context.actorId, tenantId: context.tenantId, token: parsed.data.token,
    }));
  } catch (error) {
    if (error instanceof AttemptBudgetExceeded) return authJson({ error: "RATE_LIMITED" }, 429);
    if (error instanceof Error && error.message === "INVALID_VERIFICATION_TOKEN")
      return authJson({ error: "INVALID_VERIFICATION_TOKEN" }, 400);
    return authJson({ error: "VERIFICATION_UNAVAILABLE" }, 503);
  }
}
