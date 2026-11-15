import { z } from "zod";
import { authJson, sameOriginMutation } from "@/server/auth-http";
import { requireBillingOwner } from "@/server/mobi-billing-owner";
import { getMobiBillingAccount, setMobiAutoRenew } from "@/server/mobi-billing-account";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const renewalSchema=z.object({autoRenew:z.boolean()}).strict();

function fail(error:unknown){
  const code=error instanceof Error?error.message:"BILLING_ACCOUNT_UNAVAILABLE";
  if(code==="AUTH_REQUIRED") return authJson({error:code},401);
  if(code==="PERMISSION_DENIED") return authJson({error:code},403);
  if(code==="RENEWAL_CHANGE_NOT_ALLOWED") return authJson({error:code},409);
  return authJson({error:"BILLING_ACCOUNT_UNAVAILABLE"},503);
}

export async function GET(){
  try{
    const owner=await requireBillingOwner();
    const account=await getMobiBillingAccount(owner.billingTenantKey);
    return authJson({account});
  }catch(error){return fail(error);}
}

export async function POST(request:Request){
  if(!sameOriginMutation(request)) return authJson({error:"INVALID_ORIGIN"},403);
  const parsed=renewalSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return authJson({error:"INVALID_REQUEST"},400);
  // No premature enablement until end-to-end Paddle sandbox renewal UAT.
  if(process.env.A1_MOBI_RENEWAL_CONTROL_ENABLED!=="1")
    return authJson({error:"RENEWAL_CONTROL_NOT_RELEASED"},409);
  try{
    const owner=await requireBillingOwner();
    const before=await getMobiBillingAccount(owner.billingTenantKey);
    if(before.entitlement.status!=="active"||before.plan?.interval!=="month"||
       !before.renewal.canChange)
      return authJson({error:"RENEWAL_CHANGE_NOT_ALLOWED"},409);
    const account=await setMobiAutoRenew(owner.billingTenantKey,parsed.data.autoRenew);
    return authJson({account});
  }catch(error){return fail(error);}
}
