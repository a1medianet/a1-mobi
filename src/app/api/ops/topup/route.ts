import { Prisma, CashSessionStatus } from "@prisma/client";
import { z } from "zod";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { readAuthJson } from "@/core/auth/request";
import { db } from "@/server/db";
import { postTopUp, settleTopUpProvider } from "@/modules/topup/topup-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const code = z.string().trim().min(2).max(48).regex(/^[a-zA-Z0-9._-]+$/);
const money = z.number().finite().min(0).max(9999999);
const commands = z.discriminatedUnion("action", [
  z.object({action:z.literal("provider"),code,name:z.string().trim().min(2).max(100),mode:z.enum(["IMMEDIATE","ON_ACCOUNT"])}).strict(),
  z.object({action:z.literal("service"),providerId:z.string().min(8).max(100),code,nameAr:z.string().trim().min(2).max(120),nameEn:z.string().trim().min(2).max(120),cost:money,sale:money.positive()}).strict(),
  z.object({action:z.literal("post"),serviceId:z.string().min(8).max(100),phone:z.string().trim().min(3).max(40),
    fulfilled:z.literal(true),collected:z.literal(true),idempotencyKey:z.uuid()}).strict(),
  z.object({action:z.literal("settle"),providerId:z.string().min(8).max(100),transactionIds:z.array(z.string().min(8).max(100)).min(1).max(100),
    amount:money.positive(),reference:z.string().trim().min(3).max(80),idempotencyKey:z.uuid(),confirmed:z.literal(true)}).strict(),
]);
export async function GET(){
  try{
    const ctx=await currentStoreContext("topup.manage");
    const [providers,services,transactions,session]=await Promise.all([
      db.topUpProvider.findMany({where:{tenantId:ctx.tenantId},orderBy:{name:"asc"},select:{id:true,code:true,name:true,mode:true,payableBalance:true,isActive:true}}),
      db.topUpService.findMany({where:{tenantId:ctx.tenantId},orderBy:{nameEn:"asc"},select:{id:true,providerId:true,code:true,nameAr:true,nameEn:true,defaultCost:true,defaultSale:true,isActive:true}}),
      db.topUpTransaction.findMany({where:{tenantId:ctx.tenantId,branchId:ctx.branchId},orderBy:{occurredAt:"desc"},take:40,
        select:{id:true,providerId:true,serviceId:true,customerPhone:true,costBase:true,saleBase:true,profitBase:true,status:true,settlementId:true,occurredAt:true}}),
      db.cashSession.findFirst({where:{tenantId:ctx.tenantId,branchId:ctx.branchId,status:CashSessionStatus.OPEN},select:{id:true}}),
    ]);
    const seeCosts=ctx.permissions.has("cost.read") || ctx.permissions.has("foundation.manage");
    return authJson({providers:providers.map(x=>({...x,payableBalance:seeCosts?Number(x.payableBalance):null})),
      services:services.map(x=>({...x,defaultCost:seeCosts?Number(x.defaultCost):null,defaultSale:Number(x.defaultSale)})),
      transactions:transactions.map(x=>({...x,costBase:seeCosts?Number(x.costBase):null,saleBase:Number(x.saleBase),profitBase:seeCosts?Number(x.profitBase):null})),cashOpen:Boolean(session),canConfigure:ctx.permissions.has("foundation.manage")});
  }catch(error){return safeFailure(error);}
}
function safeFailure(error:unknown){
  const message=error instanceof Error?error.message:"";
  if(message==="AUTH_REQUIRED")return authJson({error:"AUTH_REQUIRED"},401);
  if(message==="PERMISSION_DENIED")return authJson({error:"PERMISSION_DENIED"},403);
  if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")return authJson({error:"ALREADY_EXISTS"},409);
  if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2034")return authJson({error:"CONFLICT_RETRY"},409);
  return authJson({error:"OPERATION_REJECTED"},409);
}
export async function POST(request:Request){
  if(!sameOriginMutation(request))return authJson({error:"FORBIDDEN_ORIGIN"},403);
  if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return authJson({error:"INVALID_REQUEST"},400);
  let payload:unknown;
  try{payload=await readAuthJson(request,8192);}catch{return authJson({error:"INVALID_REQUEST"},400);}
  const parsed=commands.safeParse(payload);
  if(!parsed.success)return authJson({error:"INVALID_REQUEST"},400);
  const command=parsed.data;
  try{
    const ctx=await currentStoreContext(command.action==="post"?"topup.manage":"foundation.manage");
    if(command.action==="provider"){
      const provider=await db.topUpProvider.create({data:{tenantId:ctx.tenantId,code:command.code,name:command.name,mode:command.mode}});
      return authJson({id:provider.id},201);
    }
    if(command.action==="service"){
      const provider=await db.topUpProvider.findFirst({where:{id:command.providerId,tenantId:ctx.tenantId,isActive:true},select:{id:true}});
      if(!provider)return authJson({error:"PROVIDER_NOT_FOUND"},404);
      const service=await db.topUpService.create({data:{tenantId:ctx.tenantId,providerId:provider.id,code:command.code,
        nameAr:command.nameAr,nameEn:command.nameEn,defaultCost:command.cost,defaultSale:command.sale}});
      return authJson({id:service.id},201);
    }
    const open=await db.cashSession.findFirst({where:{tenantId:ctx.tenantId,branchId:ctx.branchId,status:CashSessionStatus.OPEN},select:{id:true}});
    if(!open)return authJson({error:"OPEN_CASH_SESSION_REQUIRED"},409);
    if(command.action==="post"){
      const service=await db.topUpService.findFirst({where:{id:command.serviceId,tenantId:ctx.tenantId,isActive:true,provider:{isActive:true}},
        select:{id:true,defaultCost:true,defaultSale:true}});
      if(!service)return authJson({error:"SERVICE_NOT_FOUND"},404);
      const result=await postTopUp({tenantId:ctx.tenantId,branchId:ctx.branchId,actorId:ctx.actorId,cashSessionId:open.id,
        serviceId:service.id,customerPhone:command.phone,collectionCurrency:"USD",collectionAmount:Number(service.defaultSale),
        exchangeRate:1,idempotencyKey:command.idempotencyKey,devicePresent:false});
      return authJson({id:result.id,status:result.status},201);
    }
    const provider=await db.topUpProvider.findFirst({where:{id:command.providerId,tenantId:ctx.tenantId,mode:"ON_ACCOUNT",isActive:true},select:{id:true}});
    if(!provider)return authJson({error:"PROVIDER_NOT_FOUND"},404);
    const settlement=await settleTopUpProvider({tenantId:ctx.tenantId,branchId:ctx.branchId,actorId:ctx.actorId,
      cashSessionId:open.id,providerId:provider.id,transactionIds:command.transactionIds,number:command.reference,
      currency:"USD",amount:command.amount,exchangeRate:1,idempotencyKey:command.idempotencyKey});
    return authJson({id:settlement.id,status:settlement.status},201);
  }catch(error){return safeFailure(error);}
}
