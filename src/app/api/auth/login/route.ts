import { z } from "zod";
import { db } from "@/server/db";
import { authBudgetKey } from "@/server/attempt-budget";
import { turnstileEnabled, verifyTurnstile } from "@/server/turnstile";
import { readAuthJson } from "@/core/auth/request";
import { AuthFailure, loginToStore } from "@/server/auth-service";
import { authJson, cookieOptions, sameOriginMutation, sessionCookieName } from "@/server/auth-http";
export const runtime = "nodejs";
const schema = z.object({
  tenant: z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9-]+$/),
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256),
  secondFactor: z.string().trim().min(6).max(32).optional(),
  turnstileToken: z.string().min(1).max(2048).optional(),
}).strict();
export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authJson({ error: "FORBIDDEN_ORIGIN" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return authJson({ error: "INVALID_REQUEST" }, 400);
  }
  let input;
  try {
    input = schema.safeParse(await readAuthJson(request));
  } catch { return authJson({ error: "INVALID_REQUEST" }, 400); }
  if (!input.success) return authJson({ error: "INVALID_REQUEST" }, 400);
  try {
    if(turnstileEnabled("login")){
      const alwaysRequired = process.env.A1_MOBI_TURNSTILE_LOGIN_ALWAYS_ENABLED === "1";
      const attempts=await db.authAttempt.findUnique({where:{key:authBudgetKey("account",[input.data.tenant.toLowerCase(),input.data.email.toLowerCase()])}});
      if(alwaysRequired || (attempts && attempts.attempts>=2 && Date.now()-attempts.windowStart.getTime()<900000)){
        const verdict=await verifyTurnstile({request,token:input.data.turnstileToken,surface:"login"});
        if(verdict!=="VERIFIED")return authJson({error:verdict==="UNAVAILABLE"?"CHALLENGE_UNAVAILABLE":"CHALLENGE_REQUIRED"},verdict==="UNAVAILABLE"?503:403);
      }
    }
    const result = await loginToStore(
      input.data.tenant,
      input.data.email,
      input.data.password,
      input.data.secondFactor,
    );
    const response = authJson({ ok: true });
    response.cookies.set(sessionCookieName(), result.token, cookieOptions());
    return response;
  } catch (error) {
    if (error instanceof AuthFailure) {
      const response = authJson({ error: error.code }, error.code === "RATE_LIMITED" ? 429 : 401);
      if (error.code === "RATE_LIMITED") response.headers.set("Retry-After", "900");
      return response;
    }
    return authJson({ error: "SERVICE_UNAVAILABLE" }, 503);
  }
}
