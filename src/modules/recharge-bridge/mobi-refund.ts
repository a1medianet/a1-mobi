/**
 * G5 isolated-sandbox full cash reversal. Never called from webhook.
 * Requires explicit authorized cashier + manager action against a confirmed
 * Recharge FAILED or CANCELLED source order. Does not contact real carriers.
 */
import {CashDirection,CashMovementType,CashSessionStatus,InvoiceStatus,
 PaymentStatus,Prisma,SaleStatus} from "@prisma/client";
import {db} from "@/server/db";
import {verifyUserSecondFactor} from "@/server/mfa-service";
import {consumeSensitiveActionBudget} from "@/server/attempt-budget";
import {RechargeBridgeError,type RechargeOrder} from "./receiver";

type Source=RechargeOrder&{currency?:string;totalMinor?:number};
const keyFor=(id:string)=>"g5-sandbox-sale-"+id;
const returnKey=(id:string)=>"g5-sandbox-refund-"+id;
export async function refundSyntheticG5Sale(input:{
 tenantId:string;branchId:string;actorId:string;order:Source;mfaCode:string;
}){
 const {tenantId,branchId,actorId,order}=input;
 if(process.env.A1_MOBI_RECHARGE_ADAPTER_ENABLED!=="true"||
    process.env.A1_RECHARGE_SANDBOX_ONLY!=="true"||
    process.env.A1_MOBI_RECHARGE_REAL_MONEY_ENABLED==="1")
  throw new RechargeBridgeError("RECHARGE_SANDBOX_DISABLED",403);
 if(!["FAILED","CANCELLED"].includes(order.state)||
    !order.externalRef?.startsWith("mobi-g5-test-ref-")||
    order.currency!=="USD"||!Number.isSafeInteger(order.totalMinor)||
    Number(order.totalMinor)<1)
  throw new RechargeBridgeError("REFUND_REQUIRES_CONFIRMED_SANDBOX_FAILURE",409);
 const saleKey=keyFor(order.rechargeOrderId);
 const refundKey=returnKey(order.rechargeOrderId);
 const amount=new Prisma.Decimal(Number(order.totalMinor)).div(100);
 const checkExisting=async()=>{
  const movement=await db.cashMovement.findUnique({where:{
   tenantId_idempotencyKey:{tenantId,idempotencyKey:refundKey+":cash"}}});
  if(!movement)return null;
  const record=await db.saleReturn.findUnique({where:{
   tenantId_idempotencyKey:{tenantId,idempotencyKey:refundKey}}});
  if(!record||record.id!==movement.sourceId||
    movement.direction!==CashDirection.OUT||movement.type!==CashMovementType.REFUND||
    movement.branchId!==branchId||!movement.baseAmount.equals(amount)||
    !record.refundBase.equals(amount))
   throw new RechargeBridgeError("REFUND_REPLAY_CONFLICT",409);
  const sale=await db.sale.findUnique({where:{id:record.saleId},include:{invoice:true,payments:true}});
  if(!sale||sale.tenantId!==tenantId||sale.branchId!==branchId||
     sale.status!==SaleStatus.RETURNED||sale.invoice?.status!==InvoiceStatus.CREDITED||
     sale.payments.length!==1||sale.payments[0].status!==PaymentStatus.REVERSED)
   throw new RechargeBridgeError("REFUND_INCONSISTENT",503);
  return {refundId:record.id,cashMovementId:movement.id,saleId:record.saleId,
   amountMinor:Number(order.totalMinor),currency:"USD",replayed:true,financialOwner:"MOBI"};
 };
 const prior=await checkExisting();
 if(prior)return prior;
 await consumeSensitiveActionBudget("g5-sandbox-refund",[tenantId,actorId],5);
 try{
  return await db.$transaction(async tx=>{
   const existing=await tx.saleReturn.findUnique({where:{tenantId_idempotencyKey:{
    tenantId,idempotencyKey:refundKey}}});
   if(existing)throw new RechargeBridgeError("REFUND_REPLAY_RACE",409);
   const sale=await tx.sale.findUnique({where:{
    tenantId_idempotencyKey:{tenantId,idempotencyKey:saleKey}},include:{invoice:true,payments:true}});
   if(!sale||sale.branchId!==branchId||sale.status!==SaleStatus.COMPLETED||
      sale.invoice?.status!==InvoiceStatus.ISSUED||
      (sale.invoice.snapshot as {rechargeOrderId?:string}).rechargeOrderId!==order.rechargeOrderId||
      sale.payments.length!==1||sale.payments[0].status!==PaymentStatus.POSTED||
      !sale.total.equals(amount)||!sale.paidTotal.equals(amount)||
      sale.baseCurrency!=="USD")
    throw new RechargeBridgeError("ORIGINAL_COLLECTION_NOT_REFUNDABLE",409);
   const cash=await tx.cashSession.findFirst({where:{tenantId,branchId,status:CashSessionStatus.OPEN}});
   if(!cash)throw new RechargeBridgeError("OPEN_G5_CASH_SESSION_REQUIRED",409);
   // Step-up belongs inside the same serializable transaction as the cash reversal.
   // A failed MFA check rolls back the entire write and cannot post a refund.
   const credential=await tx.mfaCredential.findUnique({
    where:{userId:actorId},select:{enabledAt:true},
   });
   if(!credential?.enabledAt)throw new RechargeBridgeError("REFUND_MFA_ENROLLMENT_REQUIRED",403);
   try{
    const verified=await verifyUserSecondFactor(tx,actorId,input.mfaCode);
    if(verified.method==="none")throw new RechargeBridgeError("REFUND_MFA_REQUIRED",403);
   }catch(error){
    if(error instanceof RechargeBridgeError)throw error;
    if(error instanceof Error&&["MFA_REQUIRED","INVALID_MFA"].includes(error.message))
     throw new RechargeBridgeError("REFUND_MFA_INVALID",403);
    throw error;
   }
   const returned=await tx.saleReturn.create({data:{
    tenantId,branchId,saleId:sale.id,actorId,
    number:"G5-R-"+order.rechargeOrderId,status:"POSTED",
    reason:"DEMO_ONLY "+order.state+" verified by Recharge before synthetic cash reversal",
    refundBase:amount,idempotencyKey:refundKey,
   }});
   const movement=await tx.cashMovement.create({data:{
    tenantId,branchId,cashSessionId:cash.id,actorId,direction:CashDirection.OUT,
    type:CashMovementType.REFUND,currency:"USD",amount,exchangeRate:1,
    baseAmount:amount,sourceType:"SaleReturn",sourceId:returned.id,
    idempotencyKey:refundKey+":cash",reason:"DEMO_ONLY G5 confirmed "+order.state,
   }});
   await tx.payment.update({where:{id:sale.payments[0].id},data:{status:PaymentStatus.REVERSED}});
   await tx.invoice.update({where:{id:sale.invoice.id},data:{status:InvoiceStatus.CREDITED}});
   await tx.sale.update({where:{id:sale.id},data:{status:SaleStatus.RETURNED,paidTotal:0,balanceDue:0}});
   return {refundId:returned.id,cashMovementId:movement.id,saleId:sale.id,
    amountMinor:Number(order.totalMinor),currency:"USD",replayed:false,financialOwner:"MOBI"};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 }catch(error){
  if((error instanceof RechargeBridgeError&&error.code==="REFUND_REPLAY_RACE")||
    (error instanceof Prisma.PrismaClientKnownRequestError&&["P2002","P2034"].includes(error.code))){
   const saved=await checkExisting();
   if(saved)return saved;
  }
  throw error;
 }
}
