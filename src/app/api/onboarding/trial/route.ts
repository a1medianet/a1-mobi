import { z } from "zod";
import { verifyTurnstile } from "@/server/turnstile";
import { sameOriginMutation, authJson } from "@/server/auth-http";
import { consumeSensitiveActionBudget, AttemptBudgetExceeded } from "@/server/attempt-budget";
import { onboardMobiTrial } from "@/server/trial-onboarding-service";
import { normalizeAccountHandle, internalAccountAddress } from "@/server/account-handle";

export const runtime="nodejs";

const schema=z.object({
  tenantSlug:z.string().trim().min(3).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  tenantName:z.string().trim().min(2).max(160),
  branchCode:z.string().trim().min(1).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  branchName:z.string().trim().min(2).max(160),
  ownerEmail:z.string().trim().email().max(254),
  ownerDisplayName:z.string().trim().min(2).max(120),
  ownerPassword:z.string().min(12).max(256),
  username:z.string().min(3).max(30).optional(),
  recoveryEmail:z.email().max(254).optional(),
  locale:z.enum(["ar","en"]),
  turnstileToken:z.string().min(1).max(2048).optional(),
}).strict();

export async function POST(request:Request){
  if(process.env.A1_MOBI_PUBLIC_TRIAL_ENABLED!=="1"){
    return authJson({error:"TRIAL_ONBOARDING_DISABLED"},503);
  }
  if(!sameOriginMutation(request)) return authJson({error:"FORBIDDEN_ORIGIN"},403);
  if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")){
    return authJson({error:"INVALID_REQUEST"},400);
  }

  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return authJson({error:"INVALID_REQUEST",issues:parsed.error.issues},400);
  const turnstile=await verifyTurnstile({request,token:parsed.data.turnstileToken,surface:"signup"});
  if(turnstile!=="DISABLED"&&turnstile!=="VERIFIED") return authJson({error:turnstile==="UNAVAILABLE"?"CHALLENGE_UNAVAILABLE":"CHALLENGE_REQUIRED"},turnstile==="UNAVAILABLE"?503:403);
  if(parsed.data.username !== undefined) {
    const handle=normalizeAccountHandle(parsed.data.username);
    if(!handle || parsed.data.ownerEmail.trim().toLowerCase() !== internalAccountAddress(handle) ||
      !parsed.data.recoveryEmail || parsed.data.recoveryEmail.toLowerCase() === parsed.data.ownerEmail.toLowerCase())
      return authJson({error:"INVALID_ACCOUNT_IDENTITY"},400);
  }
  // The platform owner address is reserved exclusively for platform authentication.
  if(parsed.data.ownerEmail.trim().toLowerCase()==="admin@a1mobi.app")
    return authJson({error:"PLATFORM_EMAIL_RESERVED"},400);
  // Production public signup must never bypass the internal identity requirement.
  if(process.env.NODE_ENV==="production" && !parsed.data.username)
    return authJson({error:"ACCOUNT_HANDLE_REQUIRED"},400);

  const forwarded=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
  try{
    await consumeSensitiveActionBudget("public-trial",[forwarded,parsed.data.ownerEmail.toLowerCase()],3);
    const {turnstileToken:_challenge,...trial}=parsed.data;
    void _challenge;
    const result=await onboardMobiTrial(trial);
    return authJson({
      ok:true,
      tenant:result.tenantSlug,
      trial:{
        status:result.entitlement.status,
        planCode:result.entitlement.planCode,
        expiresAt:result.entitlement.expiresAt,
        features:result.entitlement.features,
      },
      loginPath:"/"+parsed.data.locale+"/login?tenant="+encodeURIComponent(result.tenantSlug)+"&email="+encodeURIComponent(parsed.data.ownerEmail),
    },201);
  }catch(error){
    if(error instanceof AttemptBudgetExceeded) {
      const response=authJson({error:"RATE_LIMITED"},429);
      response.headers.set("Retry-After","900");
      return response;
    }
    const code=error instanceof Error?error.message:"SERVICE_UNAVAILABLE";
    const status=code==="INVALID_ACCOUNT_HANDLE"?400:
      code==="CONFLICT"?409:
      code==="SUBSCRIPTION_EXISTS"?409:
      code==="A1_BILLING_NOT_CONFIGURED"||code==="A1_BILLING_UNAVAILABLE"?503:500;
    return authJson({error:status<500?code:"SERVICE_UNAVAILABLE"},status);
  }
}
