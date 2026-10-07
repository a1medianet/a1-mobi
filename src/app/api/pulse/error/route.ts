import { z } from "zod";
import { currentStoreContext, authJson, sameOriginMutation } from "@/server/auth-http";
import { structuredLog } from "@/server/logger";
import { sendClientError } from "@/server/pulse-client";

export const runtime="nodejs";

const schema=z.object({
  digest:z.string().max(128).optional(),
  route:z.string().min(1).max(300).startsWith("/"),
  installationId:z.string().uuid().optional(),
}).strict();

export async function POST(request:Request){
  if(!sameOriginMutation(request))return authJson({error:"FORBIDDEN_ORIGIN"},403);
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return authJson({error:"INVALID_REQUEST"},400);
  const context=await currentStoreContext();
  structuredLog("error","client.error_boundary",{
    digest:parsed.data.digest||"unknown",
    route:parsed.data.route,
    authenticated:Boolean(context),
  });
  const delivery=await sendClientError({
    ...parsed.data,
    tenantId:context?.tenantId,
    branchId:context?.branchId,
  });
  return authJson({accepted:true,delivery},202);
}
