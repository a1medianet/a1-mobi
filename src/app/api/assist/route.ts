import { z } from "zod";
import { currentStoreContext, authJson, sameOriginMutation } from "@/server/auth-http";
import { askA1Assist, guideFallback } from "@/server/assist-client";

export const runtime="nodejs";

const schema=z.object({
  question:z.string().trim().min(2).max(1200),
  locale:z.enum(["ar","en"]),
  route:z.string().min(1).max(300).startsWith("/"),
}).strict();

export async function POST(request:Request){
  if(!sameOriginMutation(request))return authJson({error:"FORBIDDEN_ORIGIN"},403);
  const context=await currentStoreContext();
  if(!context)return authJson({error:"AUTH_REQUIRED"},401);
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return authJson({error:"INVALID_REQUEST"},400);

  const result=await askA1Assist({
    ...parsed.data,
    tenantId:context.tenantId,
    branchId:context.branchId,
    permissions:[...context.permissions].sort(),
  });
  if(result.available)return authJson({mode:"assist",answer:result.answer});

  const fallback=guideFallback(parsed.data.question,parsed.data.locale);
  return authJson({
    mode:"guide",
    answer:fallback.answer,
    helpUrl:"/product/"+parsed.data.locale+"/help#"+fallback.anchor,
    assistStatus:result.reason,
  });
}
