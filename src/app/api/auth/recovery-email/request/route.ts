import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { requestRecoveryEmailVerification } from "@/server/recovery-email-verification";
import { AttemptBudgetExceeded } from "@/server/attempt-budget";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authJson({ error: "FORBIDDEN_ORIGIN" }, 403);
  const context = await currentStoreContext();
  if (!context) return authJson({ error: "AUTH_REQUIRED" }, 401);
  try {
    const result = await requestRecoveryEmailVerification({
      userId: context.actorId, tenantId: context.tenantId,
      locale: request.headers.get("accept-language")?.toLowerCase().startsWith("en") ? "en" : "ar",
    });
    return authJson(result, 202);
  } catch (error) {
    if (error instanceof AttemptBudgetExceeded) return authJson({ error: "RATE_LIMITED" }, 429);
    return authJson({ error: "VERIFICATION_UNAVAILABLE" }, 503);
  }
}
