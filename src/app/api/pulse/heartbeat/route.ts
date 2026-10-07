import { z } from "zod";
import { currentStoreContext, authJson, sameOriginMutation } from "@/server/auth-http";
import { sendHeartbeat } from "@/server/pulse-client";

export const runtime="nodejs";

const schema=z.object({
  installationId:z.string().uuid(),
  route:z.string().min(1).max(300).startsWith("/"),
}).strict();

export async function POST(request:Request){
  if(!sameOriginMutation(request))return authJson({error:"FORBIDDEN_ORIGIN"},403);
  const context=await currentStoreContext();
  if(!context)return authJson({error:"AUTH_REQUIRED"},401);
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return authJson({error:"INVALID_REQUEST"},400);
  const delivery=await sendHeartbeat({
    ...parsed.data,
    tenantId:context.tenantId,
    branchId:context.branchId,
  });
  return authJson({accepted:true,delivery},202);
}
