import { randomBytes } from "node:crypto";
import { z } from "zod";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { controlError } from "@/server/control-http";
import { readAuthJson } from "@/core/auth/request";
import { db } from "@/server/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const command = z.discriminatedUnion("action",[
 z.object({action:z.literal("activate")}).strict(),
 z.object({action:z.literal("disable")}).strict(),
 z.object({action:z.literal("setStatus"),id:z.string().min(2).max(90),status:z.enum(["CONFIRMED","DECLINED","CLOSED"])}).strict(),
]);
export async function GET() {
 if(process.env.A1_MOBI_PUBLIC_ORDERS_ENABLED!=="1")return authJson({error:"NOT_AVAILABLE"},404);
 try{
  const ctx=await currentStoreContext("foundation.manage");
  const branch=(await db.$queryRawUnsafe<Array<{name:string;publicStoreSlug:string|null;acceptingStoreOrders:boolean}>>(
   'SELECT "name","publicStoreSlug","acceptingStoreOrders" FROM "Branch" WHERE "id"=$1 AND "tenantId"=$2 LIMIT 1',
   ctx.branchId,ctx.tenantId
  ))[0];
  if(!branch)return authJson({error:"NOT_FOUND"},404);
  type RequestRow={id:string;number:string;customerName:string;customerPhone:string;customerNote:string|null;status:string;items:unknown;totalAmount:unknown;currency:string;createdAt:Date};
  const orders=await db.$queryRawUnsafe<RequestRow[]>(
   'SELECT "id","number","customerName","customerPhone","customerNote","status","items","totalAmount","currency","createdAt" FROM "StoreOrderRequest" WHERE "tenantId"=$1 AND "branchId"=$2 ORDER BY "createdAt" DESC LIMIT 100',
   ctx.tenantId,ctx.branchId
  );
  return authJson({branchName:branch.name,slug:branch.publicStoreSlug,
   enabled:branch.acceptingStoreOrders,orders:orders.map(o=>({...o,totalAmount:Number(o.totalAmount)}))});
 }catch(error){return controlError(error);}
}
export async function POST(request:Request) {
 if(process.env.A1_MOBI_PUBLIC_ORDERS_ENABLED!=="1")return authJson({error:"NOT_AVAILABLE"},404);
 if(!sameOriginMutation(request))return authJson({error:"FORBIDDEN_ORIGIN"},403);
 if(!request.headers.get("content-type")?.startsWith("application/json"))return authJson({error:"INVALID_REQUEST"},400);
 let input:z.infer<typeof command>;
 try{
  const parsed=command.safeParse(await readAuthJson(request,2048));
  if(!parsed.success)return authJson({error:"INVALID_REQUEST"},400);
  input=parsed.data;
 }catch{return authJson({error:"INVALID_REQUEST"},400);}
 try{
  const ctx=await currentStoreContext("foundation.manage");
  const scope={tenantId:ctx.tenantId,branchId:ctx.branchId};
  if(input.action==="activate"||input.action==="disable"){
   const branch=(await db.$queryRawUnsafe<Array<{id:string;publicStoreSlug:string|null}>>(
    'SELECT "id","publicStoreSlug" FROM "Branch" WHERE "id"=$1 AND "tenantId"=$2 LIMIT 1',
    scope.branchId,scope.tenantId
   ))[0];
   if(!branch)return authJson({error:"NOT_FOUND"},404);
   const slug=branch.publicStoreSlug??randomBytes(16).toString("hex");
   await db.$executeRawUnsafe(
    'UPDATE "Branch" SET "publicStoreSlug"=$1,"acceptingStoreOrders"=$2 WHERE "id"=$3 AND "tenantId"=$4',
    slug,input.action==="activate",branch.id,scope.tenantId
   );
   return authJson({enabled:input.action==="activate",slug});
  }
  const current=(await db.$queryRawUnsafe<Array<{id:string;status:string}>>(
   'SELECT "id","status" FROM "StoreOrderRequest" WHERE "id"=$1 AND "tenantId"=$2 AND "branchId"=$3 LIMIT 1',
   input.id,scope.tenantId,scope.branchId
  ))[0];
  if(!current)return authJson({error:"NOT_FOUND"},404);
  const permitted=current.status==="NEW" ? ["CONFIRMED","DECLINED"].includes(input.status)
    : current.status==="CONFIRMED"&&input.status==="CLOSED";
  if(!permitted)return authJson({error:"INVALID_TRANSITION"},409);
  const changed=await db.$executeRawUnsafe(
   'UPDATE "StoreOrderRequest" SET "status"=$1,"updatedAt"=NOW() WHERE "id"=$2 AND "tenantId"=$3 AND "branchId"=$4 AND "status"=$5',
   input.status,current.id,scope.tenantId,scope.branchId,current.status
  );
  if(changed!==1)return authJson({error:"STALE_ORDER"},409);
  return authJson({id:current.id,status:input.status});
 }catch(error){
  return controlError(error);
 }
}
