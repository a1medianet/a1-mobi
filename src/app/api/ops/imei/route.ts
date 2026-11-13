import { DeviceIncidentStatus,DeviceIncidentVisibility,Prisma } from "@prisma/client";
import { z } from "zod";
import { authJson,currentStoreContext,sameOriginMutation } from "@/server/auth-http";
import { readAuthJson } from "@/core/auth/request";
import { db } from "@/server/db";
import { imeiIdentity } from "@/modules/device-trust/device-trust-service";
import { normalizeImei } from "@/modules/devices/imei";
import { normalizePhone } from "@/modules/customers/customer-rules";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const imei=z.string().min(15).max(32);
const command=z.discriminatedUnion("action",[
  z.object({action:z.literal("lookup"),imei}).strict(),
  z.object({
    action:z.literal("reportLoss"),imei,
    customerPhone:z.string().trim().min(7).max(32),
    evidenceReference:z.string().trim().min(6).max(180),
    kind:z.enum(["LOST","STOLEN"]),confirmed:z.literal(true),
  }).strict(),
  z.object({
    action:z.literal("closeReport"),reportId:z.string().min(2).max(90),
    reason:z.string().trim().min(8).max(500),confirmed:z.literal(true),
  }).strict(),
]);
const terminal=[DeviceIncidentStatus.CLOSED,DeviceIncidentStatus.RETURNED];
function reject(error:unknown){
 const message=error instanceof Error?error.message:"";
 if(message==="AUTH_REQUIRED")return authJson({error:message},401);
 if(message==="PERMISSION_DENIED")return authJson({error:message},403);
 if(message==="Invalid IMEI"||message==="Customer phone is invalid")return authJson({error:"INVALID_IDENTIFIER"},400);
 if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")
   return authJson({error:"CONFLICT"},409);
 return authJson({error:"REQUEST_FAILED"},400);
}
export async function POST(request:Request){
 if(process.env.A1_MOBI_C_LIVE_01_ENABLED!=="1")return authJson({error:"NOT_FOUND"},404);
 if(!sameOriginMutation(request))return authJson({error:"FORBIDDEN_ORIGIN"},403);
 if(!request.headers.get("content-type")?.startsWith("application/json"))
   return authJson({error:"INVALID_REQUEST"},400);
 let input:z.infer<typeof command>;
 try{
   const parsed=command.safeParse(await readAuthJson(request,2048));
   if(!parsed.success)return authJson({error:"INVALID_REQUEST"},400);
   input=parsed.data;
 }catch{return authJson({error:"INVALID_REQUEST"},400);}
 try{
   const needed=input.action==="lookup"?"inventory.read":"device-trust.report";
   const ctx=await currentStoreContext(needed);
   if(input.action==="lookup"){
     const id=imeiIdentity(input.imei);
     // Stock lookup must be restricted to the current branch; no cross-store inventory leakage.
     const [devices,customerDevices,reports]=await Promise.all([
       db.serializedDevice.findMany({
         where:{tenantId:ctx.tenantId,imei:normalizeImei(input.imei),
           stockLocation:{tenantId:ctx.tenantId,branchId:ctx.branchId}},
         select:{id:true,status:true,product:{select:{sku:true,nameAr:true,nameEn:true}},
           stockLocation:{select:{name:true}}},take:10,
       }),
       ctx.permissions.has("customers.read")
        ?db.customerDevice.findMany({
          where:{tenantId:ctx.tenantId,imei:normalizeImei(input.imei),
            customer:{tenantId:ctx.tenantId,createdBranchId:ctx.branchId}},
          select:{id:true,description:true,customer:{
            select:{id:true,name:true,phone:true}}},take:10,
         }):Promise.resolve([]),
       db.deviceIncidentReport.findMany({
         where:{tenantId:ctx.tenantId,imeiHash:id.hash},
         select:{id:true,status:true,imeiLast4:true,reportedAt:true,closedAt:true},
         orderBy:{reportedAt:"desc"},take:10,
       }),
     ]);
     await db.auditEvent.create({data:{
       tenantId:ctx.tenantId,branchId:ctx.branchId,actorId:ctx.actorId,
       action:"device.imei.store_lookup",entityType:"DeviceLookup",entityId:ctx.branchId,
       after:{imeiLast4:id.last4,stockMatches:devices.length,customerLinks:customerDevices.length},
     }});
     return authJson({searched:true,imeiLast4:id.last4,inventory:devices,
       customers:customerDevices,reports,externalRegistryChecked:false});
   }
   if(input.action==="reportLoss"){
     const id=imeiIdentity(input.imei);
     const normalized=normalizePhone(input.customerPhone);
     const customer=await db.customer.findFirst({
       where:{tenantId:ctx.tenantId,createdBranchId:ctx.branchId,
         phoneNormalized:normalized},select:{id:true,name:true},
     });
     if(!customer)return authJson({error:"CUSTOMER_NOT_FOUND_IN_BRANCH"},404);
     // An unverified customer declaration is never advertised on a global blacklist.
     const created=await db.$transaction(async tx=>{
       const active=await tx.deviceIncidentReport.findFirst({
         where:{tenantId:ctx.tenantId,imeiHash:id.hash,status:{notIn:terminal}},
         select:{id:true,status:true},
       });
       if(active)return {existing:true,id:active.id,status:active.status};
       const report=await tx.deviceIncidentReport.create({data:{
         tenantId:ctx.tenantId,reporterId:ctx.actorId,imeiHash:id.hash,imeiLast4:id.last4,
         status:DeviceIncidentStatus.EVIDENCE_PENDING,visibility:DeviceIncidentVisibility.STORE_ONLY,
         evidenceReference:input.evidenceReference,ownerContactRef:customer.id,
         notes:input.kind,
       }});
       await tx.auditEvent.create({data:{
         tenantId:ctx.tenantId,branchId:ctx.branchId,actorId:ctx.actorId,
         action:"device.lost_report.submitted_for_review",entityType:"DeviceIncidentReport",
         entityId:report.id,after:{status:report.status,imeiLast4:id.last4,customerId:customer.id,kind:input.kind},
       }});
       return {existing:false,id:report.id,status:report.status};
     });
     return authJson({report:created,visibility:"STORE_ONLY",
       verified:false,externalRegistryNotified:false},created.existing?409:201);
   }
   const changed=await db.$transaction(async tx=>{
     const report=await tx.deviceIncidentReport.findFirst({
       where:{id:input.reportId,tenantId:ctx.tenantId,
         status:{notIn:terminal},ownerContactRef:{not:null}},
       select:{id:true,status:true,imeiLast4:true},
     });
     if(!report)return false;
     const updated=await tx.deviceIncidentReport.updateMany({
       where:{id:report.id,tenantId:ctx.tenantId,status:report.status},
       data:{status:DeviceIncidentStatus.CLOSED,closedAt:new Date()},
     });
     if(updated.count!==1)return false;
     await tx.auditEvent.create({data:{
       tenantId:ctx.tenantId,branchId:ctx.branchId,actorId:ctx.actorId,
       action:"device.lost_report.closed",entityType:"DeviceIncidentReport",entityId:report.id,
       before:{status:report.status,imeiLast4:report.imeiLast4},
       after:{status:"CLOSED"},reason:input.reason,
     }});
     return true;
   });
   if(!changed)return authJson({error:"REPORT_NOT_FOUND_OR_CLOSED"},409);
   return authJson({closed:true});
 }catch(error){return reject(error);}
}
