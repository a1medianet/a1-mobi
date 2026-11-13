import { Prisma } from "@prisma/client";
import { z } from "zod";
import { readAuthJson } from "@/core/auth/request";
import { authJson,currentStoreContext,sameOriginMutation } from "@/server/auth-http";
import { controlError } from "@/server/control-http";
import { previewStockCount,postStockCount } from "@/modules/inventory/count-service";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const id=z.string().trim().min(1).max(100);
const scope={productId:id,locationId:id};
const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("preview"),...scope}).strict(),
 z.object({action:z.literal("post"),...scope,version:z.string().regex(/^[a-f0-9]{64}$/),countedQty:z.number().int().min(0).max(1000000),reason:z.string().trim().min(1).max(500),idempotencyKey:z.string().uuid()}).strict()
]);
export async function POST(request:Request){
 if(process.env.A1_MOBI_C_LIVE_01_ENABLED!=="1")return authJson({error:"NOT_FOUND"},404);
 if(!sameOriginMutation(request))return authJson({error:"FORBIDDEN_ORIGIN"},403);
 try{
  const ctx=await currentStoreContext("foundation.manage");
  if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))return authJson({error:"INVALID_REQUEST"},400);
  let parsed;try{parsed=schema.safeParse(await readAuthJson(request,4096));}catch{return authJson({error:"INVALID_REQUEST"},400);}
  if(!parsed.success)return authJson({error:"INVALID_REQUEST"},400);
  const input={...parsed.data,tenantId:ctx.tenantId,branchId:ctx.branchId,actorId:ctx.actorId};
  return authJson(parsed.data.action==="preview"?await previewStockCount(input):await postStockCount({...input,...parsed.data}));
 }catch(error){
  if(error instanceof Error&&["AUTH_REQUIRED","PERMISSION_DENIED"].includes(error.message))return controlError(error);
  if(error instanceof Prisma.PrismaClientKnownRequestError&&["P2034","P2002"].includes(error.code))return authJson({error:"RETRY_SAME_REQUEST"},409);
  if(error instanceof Error&&["STALE_COUNT","COUNT_IDEMPOTENCY_CONFLICT"].includes(error.message))return authJson({error:error.message},409);
  return authJson({error:"COUNT_REJECTED"},error instanceof Error&&["INVALID_COUNT","INVALID_COUNT_SCOPE"].includes(error.message)?400:503);
 }
}
