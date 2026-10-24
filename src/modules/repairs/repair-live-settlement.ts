import { randomUUID } from "node:crypto";
import { PaymentMethod, Prisma, RepairStatus } from "@prisma/client";
import { db } from "@/server/db";
import { assertRepairTransition } from "./repair-rules";

/** Transactional repair cash payment and cash journal; UUID idempotency bound to tenant. */
export async function collectRepairCashPayment(input:{
 tenantId:string;branchId:string;actorId:string;repairOrderId:string;
 amount:number;idempotencyKey:string;
}){
 if(!Number.isFinite(input.amount)||input.amount<=0||
    Math.abs(Math.round(input.amount*100)-input.amount*100)>0.00001)throw Error("INVALID_CASH_AMOUNT");
 if(!/^[a-zA-Z0-9-]{12,80}$/.test(input.idempotencyKey))throw Error("INVALID_PAYMENT_KEY");
 const key="repair-cash:"+input.idempotencyKey;
 return db.$transaction(async tx=>{
  // Bound parameter, no SQL interpolation: serialize payments to the same repair.
  await tx.$queryRawUnsafe('SELECT "id" FROM "RepairOrder" WHERE "id" = $1 FOR UPDATE',input.repairOrderId);
  const repair=await tx.repairOrder.findFirst({where:{
    id:input.repairOrderId,tenantId:input.tenantId,branchId:input.branchId}});
  if(!repair)throw Error("REPAIR_NOT_FOUND");
  const existing=await tx.cashMovement.findUnique({
   where:{tenantId_idempotencyKey:{tenantId:input.tenantId,idempotencyKey:key}},
  });
  if(existing){
   const payment=existing.sourceType==="Payment"&&existing.sourceId?
    await tx.payment.findUnique({where:{id:existing.sourceId}}):null;
   if(!payment||payment.repairOrderId!==repair.id||existing.branchId!==input.branchId||
       Number(payment.baseAmount)!==input.amount)throw Error("PAYMENT_KEY_CONFLICT");
   return {paymentId:payment.id,movementId:existing.id,replayed:true};
  }
  if(repair.status!==RepairStatus.READY)throw Error("REPAIR_NOT_READY_FOR_PAYMENT");
  if(input.amount>Number(repair.balanceDue)+0.00001)throw Error("OVERPAYMENT_REJECTED");
  const actor=await tx.user.findUniqueOrThrow({where:{id:input.actorId}});
  if(actor.tenantId!==input.tenantId)throw Error("CROSS_TENANT_ACTOR");
  const session=await tx.cashSession.findFirst({
    where:{tenantId:input.tenantId,branchId:input.branchId,status:"OPEN"},
    orderBy:{openedAt:"desc"},
  });
  if(!session)throw Error("OPEN_CASH_SESSION_REQUIRED");
  await tx.$queryRawUnsafe('SELECT "id" FROM "CashSession" WHERE "id" = $1 FOR UPDATE',session.id);
  const currentSession=await tx.cashSession.findUniqueOrThrow({where:{id:session.id}});
  if(currentSession.status!=="OPEN")throw Error("OPEN_CASH_SESSION_REQUIRED");
  const payment=await tx.payment.create({data:{
    tenantId:input.tenantId,branchId:input.branchId,repairOrderId:repair.id,
    method:PaymentMethod.CASH,currency:"USD",amount:input.amount,exchangeRate:1,
    baseAmount:input.amount,reference:key,
  }});
  const movement=await tx.cashMovement.create({data:{
    tenantId:input.tenantId,branchId:input.branchId,actorId:input.actorId,
    cashSessionId:session.id,direction:"IN",type:"REPAIR",currency:"USD",
    amount:input.amount,exchangeRate:1,baseAmount:input.amount,
    sourceType:"Payment",sourceId:payment.id,idempotencyKey:key,
  }});
  const paidTotal=Math.round((Number(repair.paidTotal)+input.amount)*100)/100;
  const balanceDue=Math.max(0,Math.round((Number(repair.finalPrice)-paidTotal)*100)/100);
  await tx.repairOrder.update({where:{id:repair.id},data:{paidTotal,balanceDue}});
  await tx.auditEvent.create({data:{
    tenantId:input.tenantId,branchId:input.branchId,actorId:input.actorId,
    action:"repair.cash.collected",entityType:"RepairOrder",entityId:repair.id,
    after:{paymentId:payment.id,movementId:movement.id,amount:input.amount,balanceDue},
  }});
  return {paymentId:payment.id,movementId:movement.id,replayed:false};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000});
}

/** Atomic delivered status + 30-day (or configured duration) written warranty. */
export async function deliverSettledRepair(input:{
 tenantId:string;branchId:string;actorId:string;repairOrderId:string;
 confirmedPickup:boolean;warrantyDays:number;warrantyTerms:string;
}){
 if(!input.confirmedPickup)throw Error("PICKUP_CONFIRMATION_REQUIRED");
 if(!Number.isInteger(input.warrantyDays)||input.warrantyDays<1||input.warrantyDays>365)
  throw Error("INVALID_WARRANTY_DAYS");
 if(input.warrantyTerms.trim().length<5||input.warrantyTerms.length>1000)
  throw Error("INVALID_WARRANTY_TERMS");
 return db.$transaction(async tx=>{
  await tx.$queryRawUnsafe('SELECT "id" FROM "RepairOrder" WHERE "id" = $1 FOR UPDATE',input.repairOrderId);
  const repair=await tx.repairOrder.findFirst({where:{
    id:input.repairOrderId,tenantId:input.tenantId,branchId:input.branchId}});
  if(!repair)throw Error("REPAIR_NOT_FOUND");
  if(repair.status===RepairStatus.DELIVERED){
   const warranty=await tx.warranty.findFirst({where:{
    tenantId:input.tenantId,branchId:input.branchId,repairOrderId:repair.id}});
   if(!warranty)throw Error("DELIVERED_WARRANTY_MISSING");
   return {repairId:repair.id,warrantyId:warranty.id,replayed:true};
  }
  assertRepairTransition(repair.status,RepairStatus.DELIVERED);
  if(Number(repair.balanceDue)>0.00001)throw Error("UNPAID_REPAIR_CANNOT_BE_DELIVERED");
  const actor=await tx.user.findUniqueOrThrow({where:{id:input.actorId}});
  if(actor.tenantId!==input.tenantId)throw Error("CROSS_TENANT_ACTOR");
  const deliveredAt=new Date();
  await tx.repairOrder.update({where:{id:repair.id},data:{
   status:RepairStatus.DELIVERED,deliveredAt,warrantyDays:input.warrantyDays,
   statusEvents:{create:{
    branchId:input.branchId,actorId:input.actorId,fromStatus:repair.status,
    toStatus:RepairStatus.DELIVERED,note:"Fully paid; customer pickup confirmed",
   }},
  }});
  const warranty=await tx.warranty.create({data:{
   tenantId:input.tenantId,branchId:input.branchId,repairOrderId:repair.id,
   number:"W-"+randomUUID().slice(0,20).toUpperCase(),
   startsAt:deliveredAt,expiresAt:new Date(deliveredAt.getTime()+input.warrantyDays*86400000),
   terms:input.warrantyTerms.trim(),
  }});
  await tx.auditEvent.create({data:{
   tenantId:input.tenantId,branchId:input.branchId,actorId:input.actorId,
   action:"repair.delivered.with_warranty",entityType:"RepairOrder",entityId:repair.id,
   after:{warrantyId:warranty.id,days:input.warrantyDays,paidTotal:Number(repair.paidTotal)},
  }});
  return {repairId:repair.id,warrantyId:warranty.id,replayed:false};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000});
}
