import { randomUUID } from "node:crypto";
import { DeviceServiceContext, DeviceTrustResult, RepairStatus } from "@prisma/client";
import { z } from "zod";
import { readAuthJson } from "@/core/auth/request";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { controlError } from "@/server/control-http";
import { db } from "@/server/db";
import { checkDeviceTrust } from "@/modules/device-trust/device-trust-service";
import {
  createRepairIntake, advanceRepair, approveRepairEstimate,
  finalizeRepairFinancials,
} from "@/modules/repairs/repair-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const id = z.string().min(2).max(90);
const short = z.string().trim().min(2).max(200);
const money = z.number().finite().min(0).max(1_000_000);
const schema = z.discriminatedUnion("action", [
  z.object({action:z.literal("intake"),customerName:short,customerPhone:z.string().trim().min(7).max(32),
    deviceDescription:short,condition:short,reportedIssue:short,
    imei:z.string().trim().regex(/^\d{15}$/),
    accessories:z.array(z.string().trim().min(1).max(70)).max(12).default([])}).strict(),
  z.object({action:z.literal("estimate"),repairId:id,diagnosis:short,
    estimateAmount:money.positive()}).strict(),
  z.object({action:z.literal("approve"),repairId:id}).strict(),
  z.object({action:z.literal("start"),repairId:id}).strict(),
  z.object({action:z.literal("ready"),repairId:id,finalPrice:money.positive(),
    laborCost:money,directCost:money}).strict(),
]);

function unavailable(error:unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code==="AUTH_REQUIRED" || code==="PERMISSION_DENIED") return controlError(error);
  if (code.includes("Cross-tenant") || code.includes("Cross-branch")) return authJson({error:"NOT_FOUND"},404);
  if (code.includes("Invalid repair transition") || code.includes("not waiting")) return authJson({error:"STATUS_CONFLICT"},409);
  return authJson({error:"OPERATION_REJECTED"},400);
}
function enabled() { return process.env.A1_MOBI_C_LIVE_02_ENABLED==="1"; }

export async function GET() {
  if(!enabled()) return authJson({error:"NOT_FOUND"},404);
  try {
    const ctx=await currentStoreContext("repair.manage");
    const rows=await db.repairOrder.findMany({
      where:{tenantId:ctx.tenantId,branchId:ctx.branchId},
      orderBy:{intakeAt:"desc"},take:75,
      include:{statusEvents:{orderBy:{occurredAt:"asc"},select:{toStatus:true,occurredAt:true}}},
    });
    return authJson({orders:rows.map(row=>({
      id:row.id,number:row.number,customerName:row.customerName,device:row.deviceDescription,
      issue:row.reportedIssue,imeiLast4:row.imei?.slice(-4)??null,status:row.status,
      estimate:row.estimateAmount===null?null:Number(row.estimateAmount),
      finalPrice:Number(row.finalPrice),paidTotal:Number(row.paidTotal),
      balanceDue:Number(row.balanceDue),intakeAt:row.intakeAt.toISOString(),
      timeline:row.statusEvents.map(step=>({status:step.toStatus,at:step.occurredAt.toISOString()})),
    }))});
  }catch(error){return controlError(error);}
}

export async function POST(request:Request) {
  if(!enabled()) return authJson({error:"NOT_FOUND"},404);
  if(!sameOriginMutation(request)) return authJson({error:"FORBIDDEN_ORIGIN"},403);
  if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return authJson({error:"INVALID_REQUEST"},400);
  let input;
  try{input=schema.safeParse(await readAuthJson(request,8192));}
  catch{return authJson({error:"INVALID_REQUEST"},400);}
  if(!input.success)return authJson({error:"INVALID_REQUEST"},400);

  try {
    const ctx=await currentStoreContext("repair.manage");
    const data=input.data;
    if(data.action==="intake"){
      const trust=await checkDeviceTrust({tenantId:ctx.tenantId,branchId:ctx.branchId,
        actorId:ctx.actorId,context:DeviceServiceContext.REPAIR,devicePresent:true,imei:data.imei});
      if(trust.result!==DeviceTrustResult.CLEAR || trust.blocked)
        return authJson({error:"DEVICE_REQUIRES_REVIEW"},409);
      const repair=await createRepairIntake({tenantId:ctx.tenantId,branchId:ctx.branchId,
        actorId:ctx.actorId,trustCheckId:trust.id,number:"REP-"+randomUUID().slice(0,16).toUpperCase(),
        customerName:data.customerName,customerPhone:data.customerPhone,
        deviceDescription:data.deviceDescription,condition:data.condition,
        reportedIssue:data.reportedIssue,imei:data.imei,accessories:data.accessories});
      return authJson({id:repair.id,number:repair.number,status:repair.status},201);
    }

    const repair=await db.repairOrder.findFirst({where:{
      id:data.repairId,tenantId:ctx.tenantId,branchId:ctx.branchId,
    },select:{id:true,status:true}});
    if(!repair)return authJson({error:"NOT_FOUND"},404);

    if(data.action==="estimate"){
      if(repair.status!==RepairStatus.INTAKE && repair.status!==RepairStatus.DIAGNOSIS)
        return authJson({error:"STATUS_CONFLICT"},409);
      if(repair.status===RepairStatus.INTAKE)await advanceRepair({tenantId:ctx.tenantId,branchId:ctx.branchId,
        actorId:ctx.actorId,repairOrderId:repair.id,toStatus:RepairStatus.DIAGNOSIS});
      const next=await advanceRepair({tenantId:ctx.tenantId,branchId:ctx.branchId,
        actorId:ctx.actorId,repairOrderId:repair.id,toStatus:RepairStatus.ESTIMATE_PENDING,
        diagnosis:data.diagnosis,estimateAmount:data.estimateAmount});
      return authJson({id:next.id,status:next.status});
    }
    if(data.action==="approve"){
      if(repair.status!==RepairStatus.ESTIMATE_PENDING)return authJson({error:"STATUS_CONFLICT"},409);
      const next=await approveRepairEstimate({tenantId:ctx.tenantId,branchId:ctx.branchId,
        actorId:ctx.actorId,repairOrderId:repair.id,approved:true});
      return authJson({id:next.id,status:next.status});
    }
    if(data.action==="start"){
      if(repair.status!==RepairStatus.APPROVED)return authJson({error:"STATUS_CONFLICT"},409);
      const next=await advanceRepair({tenantId:ctx.tenantId,branchId:ctx.branchId,
        actorId:ctx.actorId,technicianId:ctx.actorId,repairOrderId:repair.id,toStatus:RepairStatus.IN_PROGRESS});
      return authJson({id:next.id,status:next.status});
    }
    if(repair.status!==RepairStatus.IN_PROGRESS)return authJson({error:"STATUS_CONFLICT"},409);
    await finalizeRepairFinancials({tenantId:ctx.tenantId,actorId:ctx.actorId,
      repairOrderId:repair.id,finalPrice:data.finalPrice,laborCost:data.laborCost,directCost:data.directCost});
    const next=await advanceRepair({tenantId:ctx.tenantId,branchId:ctx.branchId,
      actorId:ctx.actorId,repairOrderId:repair.id,toStatus:RepairStatus.READY});
    return authJson({id:next.id,status:next.status});
  } catch(error){return unavailable(error);}
}
