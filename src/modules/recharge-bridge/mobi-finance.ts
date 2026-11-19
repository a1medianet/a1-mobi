/**
 * G5 SYNTHETIC CASH ACCEPTANCE ONLY.
 * Mobi owns customer invoice/payment/cash and Recharge owns supplier cost.
 * Never call from event inbox; only from explicit sandbox store cashier action.
 */
import {CashDirection,CashMovementType,CashSessionStatus,PaymentMethod,Prisma,SaleStatus} from "@prisma/client";
import {db} from "@/server/db";
import {RechargeBridgeError,type RechargeOrder} from "./receiver";

type SourceOrder=RechargeOrder&{
  quoteId?:string;currency?:string;totalMinor?:number;catalogVersionId?:string;
};
const keyFor=(orderId:string)=>"g5-sandbox-sale-"+orderId;
export async function collectSyntheticG5Sale(input:{
  tenantId:string;branchId:string;actorId:string;order:SourceOrder;
}){
 const {tenantId,branchId,actorId,order}=input;
 if(process.env.A1_MOBI_RECHARGE_ADAPTER_ENABLED!=="true"||
   process.env.A1_RECHARGE_SANDBOX_ONLY!=="true"||
   process.env.A1_MOBI_RECHARGE_REAL_MONEY_ENABLED==="1")
   throw new RechargeBridgeError("RECHARGE_SANDBOX_DISABLED",403);
 if(!order.externalRef.startsWith("mobi-g5-test-ref-")||
   !["PENDING","PROCESSING","COMPLETED"].includes(order.state)||
   order.currency!=="USD"||!Number.isSafeInteger(order.totalMinor)||
   Number(order.totalMinor)<1||Number(order.totalMinor)>99999999)
   throw new RechargeBridgeError("INVALID_SYNTHETIC_COLLECTION",409);
 const saleKey=keyFor(order.rechargeOrderId);
 const amount=new Prisma.Decimal(Number(order.totalMinor)).div(100);
 const checkExisting=async()=>{
   const found=await db.sale.findUnique({where:{tenantId_idempotencyKey:{tenantId,idempotencyKey:saleKey}},
     include:{invoice:true,payments:true}});
   if(!found)return null;
   if(found.branchId!==branchId||!found.invoice||
     (found.invoice.snapshot as {rechargeOrderId?:string}).rechargeOrderId!==order.rechargeOrderId||
     !found.total.equals(amount)||found.payments.length!==1)
     throw new RechargeBridgeError("COLLECTION_IDEMPOTENCY_CONFLICT",409);
   const movement=await db.cashMovement.findUnique({
     where:{tenantId_idempotencyKey:{tenantId,idempotencyKey:saleKey+":cash"}}});
   if(!movement||movement.sourceId!==found.id||movement.branchId!==branchId||
      !movement.baseAmount.equals(amount))
     throw new RechargeBridgeError("COLLECTION_INCONSISTENT",503);
   return {saleId:found.id,invoiceId:found.invoice.id,receiptId:found.payments[0].id,
     amountMinor:Number(order.totalMinor),currency:"USD",replayed:true,financialOwner:"MOBI"};
 };
 const replay=await checkExisting();
 if(replay)return replay;
 try{
  return await db.$transaction(async tx=>{
   const existing=await tx.sale.findUnique({where:{tenantId_idempotencyKey:{tenantId,idempotencyKey:saleKey}}});
   if(existing)throw new RechargeBridgeError("COLLECTION_REPLAY_RACE",409);
   const session=await tx.cashSession.findFirst({where:{tenantId,branchId,status:CashSessionStatus.OPEN}});
   if(!session)throw new RechargeBridgeError("OPEN_G5_CASH_SESSION_REQUIRED",409);
   const sale=await tx.sale.create({data:{
     tenantId,branchId,actorId,
     number:"G5-"+order.rechargeOrderId,
     status:SaleStatus.COMPLETED,subtotal:amount,total:amount,paidTotal:amount,balanceDue:0,
     baseCurrency:"USD",idempotencyKey:saleKey,
   }});
   const invoice=await tx.invoice.create({data:{
     tenantId,branchId,saleId:sale.id,number:"G5-I-"+order.rechargeOrderId,
     snapshot:{sandbox:true,source:"A1_RECHARGE_G5",financialOwner:"MOBI",
       rechargeOrderId:order.rechargeOrderId,externalRef:order.externalRef,
       quoteId:order.quoteId??null,catalogVersionId:order.catalogVersionId??null,
       currency:"USD",totalMinor:order.totalMinor},
   }});
   const receipt=await tx.payment.create({data:{
     tenantId,branchId,saleId:sale.id,method:PaymentMethod.CASH,
     currency:"USD",amount,exchangeRate:1,baseAmount:amount,status:"POSTED",
     reference:"G5-MOBI-TEST-"+order.rechargeOrderId,
   }});
   await tx.cashMovement.create({data:{
     tenantId,branchId,cashSessionId:session.id,actorId,direction:CashDirection.IN,
     type:CashMovementType.SALE,currency:"USD",amount,exchangeRate:1,baseAmount:amount,
     sourceType:"Sale",sourceId:sale.id,idempotencyKey:saleKey+":cash",
     reason:"G5 SANDBOX SYNTHETIC ONLY",
   }});
   return {saleId:sale.id,invoiceId:invoice.id,receiptId:receipt.id,
     amountMinor:Number(order.totalMinor),currency:"USD",replayed:false,financialOwner:"MOBI"};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 }catch(error){
  const isConcurrentReplay=error instanceof RechargeBridgeError&&
    error.code==="COLLECTION_REPLAY_RACE";
  const isStorageRace=error instanceof Prisma.PrismaClientKnownRequestError&&
    ["P2002","P2034"].includes(error.code);
  if(isConcurrentReplay||isStorageRace){
    // The concurrent winner may have already committed its unique sale.
    // Return the original Mobi receipt instead of asking the customer to pay again.
    const saved=await checkExisting();
    if(saved)return saved;
  }
  throw error;
 }
}
