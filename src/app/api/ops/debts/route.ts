import { z } from "zod";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { readAuthJson } from "@/core/auth/request";
import { recordManualDebt } from "@/modules/debt/manual-debt";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const payload=z.object({
  customerId:z.string().min(8).max(128),
  amount:z.string().regex(/^(?:0|[1-9]\d{0,8})(?:\.\d{1,4})?$/),
  currency:z.enum(["USD","LBP"]),
  reason:z.string().trim().min(8).max(300),
  idempotencyKey:z.uuid(),confirmed:z.literal(true),
}).strict();

export async function POST(request:Request){
  if(process.env.A1_MOBI_C_LIVE_01_ENABLED!=="1")return authJson({error:"NOT_AVAILABLE"},404);
  if(!sameOriginMutation(request))return authJson({error:"FORBIDDEN_ORIGIN"},403);
  if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return authJson({error:"INVALID_REQUEST"},400);
  try{
    const ctx=await currentStoreContext("foundation.manage");
    const parsed=payload.safeParse(await readAuthJson(request,4096));
    if(!parsed.success)return authJson({error:"INVALID_DEBT_INPUT"},400);
    const entry=await recordManualDebt({...parsed.data,tenantId:ctx.tenantId,
      branchId:ctx.branchId,actorId:ctx.actorId});
    return authJson({status:"POSTED",entryId:entry.id},201);
  }catch(error){
    const code=error instanceof Error?error.message:"";
    if(code==="AUTH_REQUIRED")return authJson({error:code},401);
    if(code==="PERMISSION_DENIED"||code==="DEBT_SCOPE_DENIED")return authJson({error:code},403);
    if(["CURRENT_EXCHANGE_RATE_REQUIRED","DEBT_RECONCILIATION_REQUIRED","UNSUPPORTED_DEBT_CURRENCY"].includes(code))
      return authJson({error:code},409);
    if(["INVALID_REASON","INVALID_AMOUNT","INVALID_EXCHANGE_RATE"].includes(code))
      return authJson({error:code},400);
    return authJson({error:"DEBT_POST_FAILED"},503);
  }
}
