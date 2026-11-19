/**
 * G5: persistent one-shot dispatch barrier. Never re-POST a recorded intent,
 * including after app restart, duplicate click, or an ambiguous timeout.
 * This is intentionally sandbox-only and cannot resolve a missing source order ID
 * until Recharge exposes scoped externalRef lookup.
 */
import {createHash} from "node:crypto";
import {Prisma} from "@prisma/client";
import {db} from "@/server/db";
import {RechargeBridgeError, type RechargeOrder} from "./receiver";

type Scope={tenantId:string;branchId:string;actorId:string};
type Input={quoteId:string;recipient:string;externalRef:string;idempotencyKey:string};
const digest=(text:string)=>createHash("sha256").update(text).digest("hex");
const openStates=["DISPATCHING","OUTCOME_UNKNOWN"] as const;
function publicIntent(row:{
 id:string;quoteId:string;externalRef:string;idempotencyKey:string;
 rechargeOrderId:string|null;orderState:string|null;orderVersion:number|null;
 status:string;reconciliationStatus:string;createdAt:Date;updatedAt:Date;
}){
 return {intentId:row.id,quoteId:row.quoteId,externalRef:row.externalRef,
  idempotencyKey:row.idempotencyKey,rechargeOrderId:row.rechargeOrderId,
  orderState:row.orderState,orderVersion:row.orderVersion,status:row.status,
  reconciliationStatus:row.reconciliationStatus,createdAt:row.createdAt,
  updatedAt:row.updatedAt};
}
export async function findOutstandingIntent(scope:Scope){
 const row=await db.rechargeOrderIntent.findFirst({where:{
  tenantId:scope.tenantId,branchId:scope.branchId,actorId:scope.actorId,
  status:{in:[...openStates]},
 },orderBy:{createdAt:"asc"}});
 return row?publicIntent(row):null;
}
export async function findRecentIntent(scope:Scope){
 const row=await db.rechargeOrderIntent.findFirst({where:{
  tenantId:scope.tenantId,branchId:scope.branchId,actorId:scope.actorId,
 },orderBy:{createdAt:"desc"}});
 return row?publicIntent(row):null;
}
export async function findStoredIntent(scope:Scope,intentId:string){
 const row=await db.rechargeOrderIntent.findFirst({where:{
  id:intentId,tenantId:scope.tenantId,branchId:scope.branchId,actorId:scope.actorId,
 }});
 if(!row)throw new RechargeBridgeError("INTENT_NOT_FOUND",404);
 return publicIntent(row);
}
export async function dispatchOriginalIntent(
 scope:Scope,input:Input,
 dispatch:(payload:Input)=>Promise<RechargeOrder>,
){
 const requestHash=digest(JSON.stringify([input.quoteId,input.recipient,input.externalRef,input.idempotencyKey]));
 const existing=await db.rechargeOrderIntent.findFirst({where:{
  tenantId:scope.tenantId,branchId:scope.branchId,OR:[
   {idempotencyKey:input.idempotencyKey},{externalRef:input.externalRef},{quoteId:input.quoteId},
  ],
 }});
 if(existing){
  if(existing.requestHash!==requestHash||existing.actorId!==scope.actorId)
   throw new RechargeBridgeError("ORIGINAL_INTENT_CONFLICT",409);
  // Once recorded, never send another POST. For an accepted order we can
  // provide its ID; for uncertain attempts use only read-side reconciliation.
  return {intent:publicIntent(existing),order:null,replayed:true};
 }
 const other=await findOutstandingIntent(scope);
 if(other)throw new RechargeBridgeError("UNRESOLVED_ORIGINAL_INTENT",409);
 let row;
 try{
  row=await db.rechargeOrderIntent.create({data:{
   tenantId:scope.tenantId,branchId:scope.branchId,actorId:scope.actorId,
   quoteId:input.quoteId,externalRef:input.externalRef,
   idempotencyKey:input.idempotencyKey,recipientHash:digest(input.recipient),
   requestHash,status:"DISPATCHING",reconciliationStatus:"NEEDS_SOURCE_LOOKUP",
   auditEvents:{create:{action:"INTENT_RECORDED",details:{sandbox:true,quoteId:input.quoteId}}},
  }});
 }catch(error){
  if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")
   throw new RechargeBridgeError("INTENT_RACE_RECONCILE_REQUIRED",409);
  throw error;
 }
 try{
  const order=await dispatch(input);
  if(order.externalRef!==input.externalRef)
   throw new RechargeBridgeError("ORDER_IDENTITY_MISMATCH",409);
  const saved=await db.rechargeOrderIntent.update({where:{id:row.id},data:{
   rechargeOrderId:order.rechargeOrderId,orderState:order.state,
   orderVersion:order.version,status:"ACKNOWLEDGED",reconciliationStatus:"SOURCE_ID_KNOWN",
   auditEvents:{create:{action:"ORDER_ACKNOWLEDGED",details:{
    rechargeOrderId:order.rechargeOrderId,version:order.version,state:order.state,
   }}},
  }});
  return {intent:publicIntent(saved),order,replayed:false};
 }catch{
  // Even a known error could happen after remote acceptance or before the
  // ACK was durably saved. Remain uncertain and prohibit automatic retries.
  await db.rechargeOrderIntent.updateMany({where:{id:row.id,status:"DISPATCHING"},
   data:{status:"OUTCOME_UNKNOWN",reconciliationStatus:"NEEDS_SOURCE_LOOKUP"}});
  await db.rechargeOrderIntentAudit.create({data:{
   intentId:row.id,action:"OUTCOME_UNKNOWN",details:{reason:"DISPATCH_OR_PERSISTENCE_UNCERTAIN"},
  }});
  throw new RechargeBridgeError("RECHARGE_OUTCOME_UNKNOWN",503);
 }
}
export async function refreshStoredIntent(
 scope:Scope,intentId:string,
 lookup:(rechargeOrderId:string)=>Promise<RechargeOrder>,
 lookupReference?:(externalRef:string)=>Promise<RechargeOrder>,
){
 const current=await db.rechargeOrderIntent.findFirst({where:{
  id:intentId,tenantId:scope.tenantId,branchId:scope.branchId,actorId:scope.actorId,
 }});
 if(!current)throw new RechargeBridgeError("INTENT_NOT_FOUND",404);
 let order:RechargeOrder;
 if(!current.rechargeOrderId){
  if(!lookupReference)return {intent:publicIntent(current),sourceLookupAvailable:false};
  try{order=await lookupReference(current.externalRef);}
  catch(error){
   // 404 is NOT definitive non-acceptance: source may still be committing.
   if(error instanceof RechargeBridgeError&&error.status===404)
    return {intent:publicIntent(current),sourceLookupAvailable:false};
   throw error;
  }
 }else order=await lookup(current.rechargeOrderId);
 if(current.rechargeOrderId&&order.rechargeOrderId!==current.rechargeOrderId)
  throw new RechargeBridgeError("ORDER_IDENTITY_MISMATCH",409);
 if(order.externalRef!==current.externalRef)
  throw new RechargeBridgeError("ORDER_IDENTITY_MISMATCH",409);
 if(current.orderVersion!==null&&order.version<current.orderVersion)
  throw new RechargeBridgeError("SOURCE_VERSION_REGRESSION",409);
 const saved=await db.rechargeOrderIntent.update({where:{id:current.id},data:{
  rechargeOrderId:order.rechargeOrderId,orderState:order.state,orderVersion:order.version,
  status:"ACKNOWLEDGED",reconciliationStatus:"SOURCE_VERIFIED",
  lastCheckedAt:new Date(),auditEvents:{create:{
   action:"SOURCE_READ_VERIFIED",details:{version:order.version,state:order.state},
  }},
 }});
 return {intent:publicIntent(saved),sourceLookupAvailable:true,order};
}
