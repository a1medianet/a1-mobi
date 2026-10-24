import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { calculateLocationBalance } from "./balance";
type Scope = { tenantId: string; branchId: string; actorId: string; productId: string; locationId: string };
const countInput = z.object({
 idempotencyKey:z.string().uuid(), version:z.string().regex(/^[a-f0-9]{64}$/),
 countedQty:z.number().int().min(0).max(1000000), reason:z.string().trim().min(1).max(500),
});
async function snapshot(tx: Prisma.TransactionClient, input: Scope) {
 const [actor, product, location] = await Promise.all([
  tx.user.findFirst({where:{id:input.actorId,tenantId:input.tenantId,isActive:true,branchId:input.branchId,branch:{tenantId:input.tenantId}},include:{userRoles:{include:{role:{include:{permissions:{include:{permission:true}}}}}}}}),
  tx.product.findFirst({where:{id:input.productId,tenantId:input.tenantId,isActive:true,isSerialized:false}}),
  tx.stockLocation.findFirst({where:{id:input.locationId,tenantId:input.tenantId,branchId:input.branchId}}),
 ]);
 if(!actor||!product||!location) throw new Error("INVALID_COUNT_SCOPE");
 if(!actor.userRoles.some(({role})=>role.tenantId===input.tenantId&&role.permissions.some(({permission})=>permission.code==="foundation.manage")))throw new Error("PERMISSION_DENIED");
 const rows=await tx.stockMovement.findMany({where:{tenantId:input.tenantId,branchId:input.branchId,productId:input.productId,OR:[{fromLocationId:input.locationId},{toLocationId:input.locationId}]},orderBy:{id:"asc"}});
 const quantity=calculateLocationBalance(input.locationId,rows.map(row=>({quantity:Number(row.quantity),fromLocationId:row.fromLocationId??undefined,toLocationId:row.toLocationId??undefined})));
 const version=createHash("sha256").update(JSON.stringify(rows.map(row=>[row.id,String(row.quantity),row.fromLocationId,row.toLocationId]))).digest("hex");
 return {quantity,version,unitCost:product.costAmount};
}
export async function previewStockCount(input: Scope) {
 return db.$transaction(async tx=>{const result=await snapshot(tx,input);return {quantity:result.quantity,version:result.version};},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}
export async function postStockCount(input: Scope & { idempotencyKey:string; version:string; countedQty:number; reason:string }) {
 if(!countInput.safeParse(input).success)throw new Error("INVALID_COUNT");
 return db.$transaction(async tx=>{
  const current=await snapshot(tx,input);
  const previous=await tx.auditEvent.findFirst({where:{tenantId:input.tenantId,entityType:"StockCount",entityId:input.idempotencyKey,action:"inventory.count.posted"}});
  const payload={productId:input.productId,locationId:input.locationId,version:input.version,countedQty:input.countedQty,reason:input.reason.trim()};
  if(previous){
   const after=previous.after as Prisma.JsonObject;
   if(previous.branchId!==input.branchId||previous.actorId!==input.actorId||Object.entries(payload).some(([key,value])=>after[key]!==value))throw new Error("COUNT_IDEMPOTENCY_CONFLICT");
   return tx.stockCount.findFirstOrThrow({where:{id:input.idempotencyKey,tenantId:input.tenantId,branchId:input.branchId,locationId:input.locationId},include:{lines:true}});
  }
  if(current.version!==input.version)throw new Error("STALE_COUNT");
  const count=await tx.stockCount.create({data:{id:input.idempotencyKey,tenantId:input.tenantId,branchId:input.branchId,locationId:input.locationId,status:"POSTED",postedAt:new Date(),lines:{create:{productId:input.productId,expectedQty:current.quantity,countedQty:input.countedQty,reason:payload.reason}}},include:{lines:true}});
  const delta=input.countedQty-current.quantity;
  if(delta!==0)await tx.stockMovement.create({data:{tenantId:input.tenantId,branchId:input.branchId,productId:input.productId,type:"COUNT_VARIANCE",quantity:Math.abs(delta),fromLocationId:delta<0?input.locationId:undefined,toLocationId:delta>0?input.locationId:undefined,unitCost:current.unitCost,reason:payload.reason,referenceType:"StockCount",referenceId:count.id,idempotencyKey:"count:"+input.idempotencyKey}});
  await tx.auditEvent.create({data:{tenantId:input.tenantId,branchId:input.branchId,actorId:input.actorId,action:"inventory.count.posted",entityType:"StockCount",entityId:count.id,reason:payload.reason,before:{quantity:current.quantity,version:current.version},after:{...payload,expectedQty:current.quantity,quantity:input.countedQty,variance:delta}}});
  return count;
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}
