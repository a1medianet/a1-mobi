import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { controlError } from "@/server/control-http";
import { readAuthJson } from "@/core/auth/request";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";
const fields = {
 sku:z.string().trim().min(2).max(90).regex(/^[A-Za-z0-9._-]+$/),
 nameAr:z.string().trim().min(2).max(160), nameEn:z.string().trim().min(2).max(160),
 price:z.number().finite().positive().max(999999999),
};
const command=z.discriminatedUnion("action",[
 z.object({action:z.literal("create"),...fields,type:z.enum(["DEVICE","ACCESSORY","PART"])}).strict(),
 z.object({action:z.literal("update"),id:z.string().min(2).max(90),...fields}).strict(),
 z.object({action:z.literal("setActive"),id:z.string().min(2).max(90),isActive:z.boolean()}).strict(),
]);
export async function GET(){
 try{
  const ctx=await currentStoreContext("inventory.read");
  const products=await db.product.findMany({where:{tenantId:ctx.tenantId},orderBy:{createdAt:"desc"},
   select:{id:true,sku:true,nameAr:true,nameEn:true,type:true,isSerialized:true,isActive:true,basePrice:true}});
  return authJson({products:products.map(({basePrice,...p})=>({...p,price:Number(basePrice)}))});
 }catch(error){return controlError(error);}
}
export async function POST(request:Request){
 if(!sameOriginMutation(request))return authJson({error:"FORBIDDEN_ORIGIN"},403);
 if(!request.headers.get("content-type")?.startsWith("application/json"))return authJson({error:"INVALID_REQUEST"},400);
 try{
  const ctx=await currentStoreContext("foundation.manage");
  let body:unknown;
  try{body=await readAuthJson(request,4096);}catch{return authJson({error:"INVALID_REQUEST"},400);}
  const parsed=command.safeParse(body);
  if(!parsed.success)return authJson({error:"INVALID_REQUEST"},400);
  const input=parsed.data;
  const product=await db.$transaction(async tx=>{
   const before=input.action==="create"?null:await tx.product.findFirst({where:{id:input.id,tenantId:ctx.tenantId}});
   if(input.action!=="create"&&!before)throw new Error("NOT_FOUND");
   if(input.action==="update"&&Number(before!.minimumPrice)>input.price)throw new Error("CONFLICT");
   let after;
   if(input.action==="create"){
    const category=await tx.category.upsert({where:{tenantId_code:{tenantId:ctx.tenantId,code:input.type}},
     create:{tenantId:ctx.tenantId,code:input.type,nameAr:input.type==="DEVICE"?"هواتف":input.type==="PART"?"قطع صيانة":"إكسسوارات",nameEn:input.type},update:{}});
    after=await tx.product.create({data:{tenantId:ctx.tenantId,categoryId:category.id,sku:input.sku,nameAr:input.nameAr,nameEn:input.nameEn,
     type:input.type,isSerialized:input.type==="DEVICE",basePrice:input.price}});
    await tx.stockLocation.upsert({where:{tenantId_code:{tenantId:ctx.tenantId,code:"SHOP-"+ctx.branchId}},
     create:{tenantId:ctx.tenantId,branchId:ctx.branchId,code:"SHOP-"+ctx.branchId,name:"Store inventory"},update:{}});
    if(input.type==="DEVICE"){
     const manufacturer=await tx.manufacturer.upsert({where:{tenantId_code:{tenantId:ctx.tenantId,code:"UNSPECIFIED"}},
      create:{tenantId:ctx.tenantId,code:"UNSPECIFIED",name:"Unspecified"},update:{}});
     const family=await tx.deviceFamily.upsert({where:{tenantId_manufacturerId_name:{tenantId:ctx.tenantId,manufacturerId:manufacturer.id,name:"Phones"}},
      create:{tenantId:ctx.tenantId,manufacturerId:manufacturer.id,name:"Phones"},update:{}});
     const model=await tx.deviceModel.upsert({where:{tenantId_familyId_name:{tenantId:ctx.tenantId,familyId:family.id,name:input.nameEn}},
      create:{tenantId:ctx.tenantId,familyId:family.id,name:input.nameEn},update:{}});
     await tx.deviceVariant.upsert({where:{tenantId_modelId_name:{tenantId:ctx.tenantId,modelId:model.id,name:input.sku}},
      create:{tenantId:ctx.tenantId,modelId:model.id,name:input.sku},update:{}});
    }
   }else{
    after=await tx.product.update({where:{id:before!.id,tenantId:ctx.tenantId},data:input.action==="setActive"?{isActive:input.isActive}:
     {sku:input.sku,nameAr:input.nameAr,nameEn:input.nameEn,basePrice:input.price}});
   }
   const snapshot=(p:typeof after)=>({sku:p.sku,nameAr:p.nameAr,nameEn:p.nameEn,price:String(p.basePrice),isActive:p.isActive});
   await tx.auditEvent.create({data:{tenantId:ctx.tenantId,branchId:ctx.branchId,actorId:ctx.actorId,
    action:"catalog.product."+input.action,entityType:"Product",entityId:after.id,
    ...(before?{before:snapshot(before)}:{}),after:snapshot(after)}});
   return after;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  return authJson({id:product.id},input.action==="create"?201:200);
 }catch(error){
  if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")return authJson({error:"SKU_EXISTS"},409);
  if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2034")return authJson({error:"CONFLICT"},409);
  if(error instanceof SyntaxError)return authJson({error:"INVALID_REQUEST"},400);
  return controlError(error);
 }
}
