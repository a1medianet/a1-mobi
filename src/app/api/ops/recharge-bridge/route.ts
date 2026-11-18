/**
 * G5 test-only, same-origin Mobi gateway. No customer invoice, POS or cash writes.
 * Recharge's /v1 is a separate service; clients never learn its bearer token.
 */
import {z} from "zod";
import {authJson,currentStoreContext,sameOriginMutation} from "@/server/auth-http";
import {readAuthJson} from "@/core/auth/request";
import {createRechargeReceiver,RechargeBridgeError} from "@/modules/recharge-bridge/receiver";
import {createRechargeSandboxTransport} from "@/modules/recharge-bridge/http";
import {resolveRechargeSandboxMapping} from "@/modules/recharge-bridge/sandbox-config";
import {collectSyntheticG5Sale} from "@/modules/recharge-bridge/mobi-finance";
import {refundSyntheticG5Sale} from "@/modules/recharge-bridge/mobi-refund";
import {db} from "@/server/db";
import {AttemptBudgetExceeded} from "@/server/attempt-budget";
import {scanRechargeReconciliation} from "@/modules/recharge-bridge/reconciliation";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const id=z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const key=z.string().trim().min(12).max(128).regex(/^[A-Za-z0-9_-]+$/);
const country=z.string().regex(/^[A-Z]{2}$/);
const operator=z.string().regex(/^[A-Za-z0-9_-]{1,48}$/);
const action=z.discriminatedUnion("action",[
 z.object({action:z.literal("quote"),country,operator,sku:id,quantity:z.number().int().min(1).max(100),idempotencyKey:key}).strict(),
 z.object({action:z.literal("order"),quoteId:id,recipient:z.string().trim().min(3).max(80),
   externalRef:id,idempotencyKey:key}).strict(),
 z.object({action:z.literal("cancel"),rechargeOrderId:id,idempotencyKey:key}).strict(),
 z.object({action:z.literal("collect"),rechargeOrderId:id}).strict(),
 z.object({action:z.literal("refund"),rechargeOrderId:id,acknowledgeSandbox:z.literal(true),mfaCode:z.string().trim().min(6).max(64)}).strict(),
]);
function gateway(tenantId:string,branchId:string){
 const {baseUrl,mapping}=resolveRechargeSandboxMapping(tenantId,branchId);
 const transport=createRechargeSandboxTransport({
  baseUrl,merchantId:mapping.merchantId,branchId:mapping.rechargeBranchId,
  getToken:async()=>mapping.token,timeoutMs:8000,
 });
 return createRechargeReceiver({
  merchantId:mapping.merchantId,branchId:mapping.rechargeBranchId,transport,
  env:{A1_MOBI_RECHARGE_SANDBOX_ENABLED:"1"},
 });
}
function safeFailure(error:unknown){
 if(error instanceof AttemptBudgetExceeded)return authJson({error:"RATE_LIMITED"},429);
 if(error instanceof RechargeBridgeError){
  const status=error.status>=400&&error.status<600?error.status:503;
  return authJson({error:error.code,retryAction:error.code==="RECHARGE_OUTCOME_UNKNOWN"
    ?"CHECK_ORDER_STATUS_WITH_ORIGINAL_REFERENCE":undefined},status);
 }
 const message=error instanceof Error?error.message:"";
 if(message==="AUTH_REQUIRED")return authJson({error:"AUTH_REQUIRED"},401);
 if(message==="PERMISSION_DENIED")return authJson({error:"PERMISSION_DENIED"},403);
 return authJson({error:"RECHARGE_GATEWAY_UNAVAILABLE"},503);
}
export async function GET(request:Request){
 try{
  const ctx=await currentStoreContext("topup.manage");
  const gatewayInstance=gateway(ctx.tenantId,ctx.branchId);
  const url=new URL(request.url);
  const view=url.searchParams.get("view");
  if(view==="catalog"){
   const parsed=z.object({country,operator}).safeParse({
    country:url.searchParams.get("country"),operator:url.searchParams.get("operator"),
   });
   if(!parsed.success)return authJson({error:"INVALID_CATALOG_FILTER"},400);
   return authJson(await gatewayInstance.listCatalog(parsed.data.country,parsed.data.operator));
  }
  if(view==="order"){
   const parsed=id.safeParse(url.searchParams.get("id"));
   if(!parsed.success)return authJson({error:"INVALID_ORDER_ID"},400);
   return authJson(await gatewayInstance.getOrder(parsed.data));
  }
  if(view==="events"){
   if(!ctx.permissions.has("foundation.manage"))
     return authJson({error:"PERMISSION_DENIED"},403);
   const cursor=url.searchParams.get("cursor")??"0";
   return authJson(await gatewayInstance.replayEvents(cursor));
  }
  if(view==="reconcile"){
   if(!ctx.permissions.has("foundation.manage"))return authJson({error:"PERMISSION_DENIED"},403);
   const merchantId=resolveRechargeSandboxMapping(ctx.tenantId,ctx.branchId).mapping.merchantId;
   const diagnostic=await scanRechargeReconciliation({
    maxPages:20,
    fetchPage:async cursor=>gatewayInstance.replayEvents(cursor),
    findInbox:async eventIds=>db.rechargeWebhookInbox.findMany({where:{
     tenantId:ctx.tenantId,branchId:ctx.branchId,merchantId,
     eventId:{in:eventIds},
    },select:{eventId:true,orderVersion:true,state:true,rechargeOrderId:true}}),
   });
   return authJson(diagnostic);
  }
  if(view==="settlements"){
   if(!ctx.permissions.has("cost.read")&&!ctx.permissions.has("foundation.manage"))
     return authJson({error:"PERMISSION_DENIED"},403);
   const range=z.object({from:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
     to:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}).safeParse({
      from:url.searchParams.get("from"),to:url.searchParams.get("to"),
     });
   if(!range.success)return authJson({error:"INVALID_DATE_RANGE"},400);
   return authJson(await gatewayInstance.listSupplierSettlements(range.data.from,range.data.to));
  }
  return authJson({error:"INVALID_VIEW"},400);
 }catch(error){return safeFailure(error);}
}
export async function POST(request:Request){
 if(!sameOriginMutation(request))return authJson({error:"FORBIDDEN_ORIGIN"},403);
 if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
  return authJson({error:"INVALID_REQUEST"},400);
 let payload:unknown;
 try{payload=await readAuthJson(request,8192);}catch{return authJson({error:"INVALID_REQUEST"},400);}
 const parsed=action.safeParse(payload);
 if(!parsed.success)return authJson({error:"INVALID_REQUEST"},400);
 try{
  const command=parsed.data;
  const ctx=await currentStoreContext(["cancel","refund"].includes(command.action)?"foundation.manage":"topup.manage");
  if(["collect","refund"].includes(command.action)&&!ctx.permissions.has("cash.manage"))
   return authJson({error:"PERMISSION_DENIED"},403);
  const gatewayInstance=gateway(ctx.tenantId,ctx.branchId);
  if(command.action==="quote")
   return authJson(await gatewayInstance.createQuote({
    country:command.country,operator:command.operator,sku:command.sku,quantity:command.quantity,
   },command.idempotencyKey),201);
  if(command.action==="order")
   return authJson(await gatewayInstance.createOrder({
    quoteId:command.quoteId,recipient:command.recipient,externalRef:command.externalRef,
   },command.idempotencyKey),201);
  if(command.action==="refund"){
   const order=await gatewayInstance.getOrder(command.rechargeOrderId);
   const result=await refundSyntheticG5Sale({tenantId:ctx.tenantId,branchId:ctx.branchId,actorId:ctx.actorId,order,mfaCode:command.mfaCode});
   return authJson(result,result.replayed?200:201);
  }
  if(command.action==="collect"){
   const order=await gatewayInstance.getOrder(command.rechargeOrderId);
   const saved=await collectSyntheticG5Sale({tenantId:ctx.tenantId,branchId:ctx.branchId,actorId:ctx.actorId,order});
   return authJson(saved,saved.replayed?200:201);
  }
  return authJson(await gatewayInstance.cancelOrder(command.rechargeOrderId,command.idempotencyKey),202);
 }catch(error){return safeFailure(error);}
}
