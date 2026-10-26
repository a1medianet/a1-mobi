import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { readAuthJson } from "@/core/auth/request";
import { authJson, sameOriginMutation } from "@/server/auth-http";
import { db } from "@/server/db";
import { publicStoreCatalog } from "@/server/public-store";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const schema=z.object({
 name:z.string().trim().min(2).max(90),
 phone:z.string().trim().regex(/^\+?[0-9\s()-]{7,25}$/),
 note:z.string().trim().max(500).optional(),
 idempotencyKey:z.string().uuid(),
 items:z.array(z.object({productId:z.string().min(2).max(90),quantity:z.number().int().min(1).max(12)}).strict()).min(1).max(12),
 website:z.string().max(0).optional(),
}).strict();
export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 if(!sameOriginMutation(request))return authJson({error:"FORBIDDEN_ORIGIN"},403);
 if(!request.headers.get("content-type")?.startsWith("application/json"))return authJson({error:"INVALID_REQUEST"},400);
 let input:z.infer<typeof schema>;
 try{
  const parsed=schema.safeParse(await readAuthJson(request,8192));
  if(!parsed.success)return authJson({error:"INVALID_REQUEST"},400);
  input=parsed.data;
 }catch{return authJson({error:"INVALID_REQUEST"},400);}
 const {slug}=await params;
 try{
  const store=await publicStoreCatalog(slug);
  if(!store)return authJson({error:"STORE_NOT_AVAILABLE"},404);
  const ids=input.items.map(i=>i.productId);
  if(new Set(ids).size!==ids.length)return authJson({error:"INVALID_BASKET"},400);
  const existing=(await db.$queryRawUnsafe<Array<{number:string;status:string;branchId:string}>>(
   'SELECT "number","status","branchId" FROM "StoreOrderRequest" WHERE "tenantId"=$1 AND "idempotencyKey"=$2 LIMIT 1',
   store.tenantId,input.idempotencyKey
  ))[0];
  if(existing){
   if(existing.branchId!==store.id)return authJson({error:"INVALID_REQUEST"},400);
   return authJson({reference:existing.number,status:existing.status,accepted:true},200);
  }
  const catalog=new Map(store.products.map(p=>[p.id,p]));
  const items=[];let total=0;let units=0;
  for(const chosen of input.items){
   const product=catalog.get(chosen.productId);
   if(!product||chosen.quantity>product.available)return authJson({error:"ITEM_NOT_AVAILABLE"},409);
   units+=chosen.quantity;
   if(units>12)return authJson({error:"TOO_MANY_ITEMS"},400);
   const lineTotal=Number((product.price*chosen.quantity).toFixed(4));total+=lineTotal;
   items.push({productId:product.id,sku:product.sku,nameAr:product.nameAr,nameEn:product.nameEn,
    quantity:chosen.quantity,unitPrice:product.price,lineTotal});
  }
  const [rate]=await db.$queryRawUnsafe<Array<{count:bigint}>>(
   'SELECT COUNT(*)::bigint AS count FROM "StoreOrderRequest" WHERE "tenantId"=$1 AND "branchId"=$2 AND "customerPhone"=$3 AND "createdAt">NOW()-INTERVAL \'15 minutes\'',
   store.tenantId,store.id,input.phone
  );
  if(Number(rate.count)>=3)return authJson({error:"PLEASE_WAIT"},429);
  const number="WEB-"+randomBytes(6).toString("hex").toUpperCase();
  await db.$executeRawUnsafe(
   'INSERT INTO "StoreOrderRequest" ("id","tenantId","branchId","idempotencyKey","number","customerName","customerPhone","customerNote","status","items","totalAmount","currency","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::decimal,$12,NOW(),NOW())',
   randomUUID(),store.tenantId,store.id,input.idempotencyKey,number,input.name,input.phone,input.note??null,
   "NEW",JSON.stringify(items),Number(total.toFixed(4)),"USD"
  );
  return authJson({reference:number,status:"NEW",accepted:true},201);
 }catch{
  return authJson({error:"ORDER_UNAVAILABLE"},503);
 }
}
