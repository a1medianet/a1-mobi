import { z } from "zod";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { readAuthJson } from "@/core/auth/request";
import { db } from "@/server/db";
import { changeEngagement, listEngagement } from "@/modules/engagement/engagement-store";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const create=z.object({
  action:z.literal("CREATE"),type:z.enum(["FOLLOWUP","CAMPAIGN"]),
  title:z.string().trim().min(3).max(120),detail:z.string().trim().min(5).max(1200),
  customerId:z.string().min(8).max(128).optional(),
  channel:z.enum(["INTERNAL","EMAIL","WHATSAPP","SMS"]).optional(),
  dueAt:z.iso.datetime({offset:true}).optional(),confirmed:z.literal(true),
}).strict();
const complete=z.object({
  action:z.literal("COMPLETE"),type:z.literal("FOLLOWUP"),
  id:z.uuid(),confirmed:z.literal(true),
}).strict();
const payload=z.discriminatedUnion("action",[create,complete]);
export async function GET(request:Request){
  try{
    const ctx=await currentStoreContext("foundation.manage");
    const type=new URL(request.url).searchParams.get("type");
    if(type!=="FOLLOWUP"&&type!=="CAMPAIGN")return authJson({error:"INVALID_TYPE"},400);
    return authJson({records:await listEngagement({...ctx,type})});
  }catch(error){
    const code=error instanceof Error?error.message:"";
    return authJson({error:code==="AUTH_REQUIRED"?code:code==="PERMISSION_DENIED"?code:"ENGAGEMENT_LOAD_FAILED"},
      code==="AUTH_REQUIRED"?401:code==="PERMISSION_DENIED"?403:503);
  }
}
export async function POST(request:Request){
  if(!sameOriginMutation(request))return authJson({error:"FORBIDDEN_ORIGIN"},403);
  if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return authJson({error:"INVALID_REQUEST"},400);
  try{
    const ctx=await currentStoreContext("foundation.manage");
    const parsed=payload.safeParse(await readAuthJson(request,4096));
    if(!parsed.success)return authJson({error:"INVALID_REQUEST"},400);
    const input=parsed.data;
    if(input.action==="CREATE"&&input.customerId){
      const customer=await db.customer.findFirst({where:{tenantId:ctx.tenantId,id:input.customerId},
        select:{id:true}});
      if(!customer)return authJson({error:"CUSTOMER_NOT_FOUND"},404);
    }
    const result=await changeEngagement({...ctx,...input});
    return authJson({id:result.id,status:result.status},input.action==="CREATE"?201:200);
  }catch(error){
    const code=error instanceof Error?error.message:"";
    if(code==="AUTH_REQUIRED")return authJson({error:code},401);
    if(code==="PERMISSION_DENIED")return authJson({error:code},403);
    if(["ENGAGEMENT_LIMIT","FOLLOWUP_NOT_FOUND"].includes(code))return authJson({error:code},409);
    return authJson({error:"ENGAGEMENT_SAVE_FAILED"},503);
  }
}
