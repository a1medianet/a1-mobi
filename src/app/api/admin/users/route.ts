import { z } from "zod";
import { readAuthJson } from "@/core/auth/request";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { controlError } from "@/server/control-http";
import { createStoreUser, listStoreUsers } from "@/server/foundation-control";
import { db } from "@/server/db";
import { getMobiEntitlements } from "@/server/billing-client";

export const runtime = "nodejs";
const createSchema = z.object({
  email: z.string().trim().email().max(254),
  displayName: z.string().trim().min(1).max(160),
  password: z.string().min(12).max(256),
  locale: z.enum(["ar", "en"]),
  roleIds: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
}).strict();

export async function GET() {
  try {
    const context = await currentStoreContext("users.manage");
    return authJson({ users: await listStoreUsers(context) });
  } catch (error) { return controlError(error); }
}

async function enforceStaffEntitlement(tenantId:string){
  const tenant=await db.tenant.findUnique({
    where:{id:tenantId},
    select:{billingTenantKey:true},
  });
  if(!tenant)return {ok:false as const,status:401,error:"AUTH_REQUIRED"};

  if(!tenant.billingTenantKey){
    return process.env.A1_MOBI_ENFORCE_ENTITLEMENTS==="1"
      ? {ok:false as const,status:403,error:"ENTITLEMENT_BINDING_REQUIRED"}
      : {ok:true as const,legacy:true as const};
  }

  let entitlement;
  try{entitlement=await getMobiEntitlements(tenant.billingTenantKey)}
  catch{return {ok:false as const,status:503,error:"ENTITLEMENT_UNAVAILABLE"}}

  if(!["trialing","active"].includes(entitlement.status)){
    return {ok:false as const,status:402,error:"SUBSCRIPTION_REQUIRED"};
  }
  const max=Number(entitlement.features["staff.max"]||0);
  if(!Number.isFinite(max)||max<1){
    return {ok:false as const,status:403,error:"STAFF_ENTITLEMENT_REQUIRED"};
  }
  const active=await db.user.count({where:{tenantId,isActive:true}});
  if(active>=max){
    return {ok:false as const,status:409,error:"STAFF_LIMIT_REACHED",limit:max};
  }
  return {ok:true as const,limit:max,active};
}

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authJson({ error: "FORBIDDEN_ORIGIN" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return authJson({ error: "INVALID_REQUEST" }, 400);
  }
  let input;
  try { input = createSchema.safeParse(await readAuthJson(request)); }
  catch { return authJson({ error: "INVALID_REQUEST" }, 400); }
  if (!input.success) return authJson({ error: "INVALID_REQUEST" }, 400);
  try {
    const context = await currentStoreContext("users.manage");
    const entitlement=await enforceStaffEntitlement(context.tenantId);
    if(!entitlement.ok)return authJson({error:entitlement.error,...("limit" in entitlement?{limit:entitlement.limit}:{})},entitlement.status);
    const user = await createStoreUser(context, input.data);
    return authJson({ user }, 201);
  } catch (error) { return controlError(error); }
}
