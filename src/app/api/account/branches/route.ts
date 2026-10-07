import { z } from "zod";
import { currentStoreContext, authJson, sameOriginMutation } from "@/server/auth-http";
import { db } from "@/server/db";
import { getMobiEntitlements } from "@/server/billing-client";

export const runtime="nodejs";

const schema=z.object({
  code:z.string().trim().min(1).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  name:z.string().trim().min(2).max(160),
}).strict();

async function accountContext(){
  const context=await currentStoreContext("foundation.manage");
  const tenant=await db.tenant.findUnique({
    where:{id:context.tenantId},
    select:{id:true,billingTenantKey:true},
  });
  if(!tenant) throw new Error("AUTH_REQUIRED");
  return {context,tenant};
}

export async function GET(){
  try{
    const {context}=await accountContext();
    const branches=await db.branch.findMany({
      where:{tenantId:context.tenantId},
      select:{id:true,code:true,name:true,createdAt:true,_count:{select:{users:true}}},
      orderBy:{createdAt:"asc"},
    });
    return authJson({branches});
  }catch(error){
    const code=error instanceof Error?error.message:"SERVICE_UNAVAILABLE";
    return authJson({error:code==="PERMISSION_DENIED"?code:"AUTH_REQUIRED"},code==="PERMISSION_DENIED"?403:401);
  }
}

export async function POST(request:Request){
  if(!sameOriginMutation(request)) return authJson({error:"FORBIDDEN_ORIGIN"},403);
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return authJson({error:"INVALID_REQUEST"},400);

  try{
    const {context,tenant}=await accountContext();
    if(!tenant.billingTenantKey) return authJson({error:"ENTITLEMENT_UNAVAILABLE"},403);

    let entitlement;
    try{entitlement=await getMobiEntitlements(tenant.billingTenantKey)}
    catch{return authJson({error:"ENTITLEMENT_UNAVAILABLE"},503)}

    if(!["trialing","active"].includes(entitlement.status)) return authJson({error:"SUBSCRIPTION_REQUIRED"},402);
    const max=Number(entitlement.features["branches.max"]||0);
    if(!Number.isFinite(max)||max<1) return authJson({error:"BRANCH_ENTITLEMENT_REQUIRED"},403);

    const existing=await db.branch.count({where:{tenantId:context.tenantId}});
    if(existing>=max) return authJson({error:"BRANCH_LIMIT_REACHED",limit:max},409);

    const branchRow=await db.$transaction(async tx=>{
      const created=await tx.branch.create({data:{
        tenantId:context.tenantId,
        code:parsed.data.code.toUpperCase(),
        name:parsed.data.name,
      }});
      await tx.auditEvent.create({data:{
        tenantId:context.tenantId,
        branchId:context.branchId,
        actorId:context.actorId,
        action:"branch.create",
        entityType:"Branch",
        entityId:created.id,
        after:{code:created.code,name:created.name},
      }});
      return created;
    });
    return authJson({branch:{id:branchRow.id,code:branchRow.code,name:branchRow.name}},201);
  }catch(error){
    const code=error instanceof Error?error.message:"SERVICE_UNAVAILABLE";
    const status=code==="PERMISSION_DENIED"?403:code==="AUTH_REQUIRED"?401:code.includes("Unique")?409:500;
    return authJson({error:status<500?code:"SERVICE_UNAVAILABLE"},status);
  }
}
