import { randomUUID } from "node:crypto";
import { DeviceServiceContext, DeviceTrustResult, RepairStatus, Prisma } from "@prisma/client";
import { openCashSession } from "@/modules/cash/cash-service";
import { collectRepairCashPayment,deliverSettledRepair } from "@/modules/repairs/repair-live-settlement";
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
  z.object({action:z.literal("openCash"),openingUsd:money,
    openingLbp:money,openingExchangeRate:money.positive()}).strict(),
  z.object({action:z.literal("pay"),repairId:id,amount:money.positive(),
    idempotencyKey:z.string().uuid()}).strict(),
  z.object({action:z.literal("deliver"),repairId:id,confirmedPickup:z.literal(true),
    warrantyDays:z.number().int().min(1).max(365),warrantyTerms:z.string().trim().min(5).max(1000)}).strict(),
]);

function unavailable(error:unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code==="AUTH_REQUIRED" || code==="PERMISSION_DENIED") return controlError(error);
  if (code.includes("Cross-tenant") || code.includes("Cross-branch")) return authJson({error:"NOT_FOUND"},404);
  if (code.includes("Invalid repair transition") || code.includes("not waiting")) return authJson({error:"STATUS_CONFLICT"},409);
  if (code === "REPAIR_NOT_FOUND") return authJson({error:"NOT_FOUND"},404);
  if (["OVERPAYMENT_REJECTED","PAYMENT_KEY_CONFLICT","OPEN_CASH_SESSION_REQUIRED",
    "REPAIR_NOT_READY_FOR_PAYMENT","UNPAID_REPAIR_CANNOT_BE_DELIVERED",
    "INVALID_CASH_AMOUNT","PICKUP_CONFIRMATION_REQUIRED","DELIVERED_WARRANTY_MISSING"]
    .includes(code))return authJson({error:code},409);
  if (code.includes("already has an open cash session")||code==="P2034")
    return authJson({error:"CASH_CONFLICT_RETRY"},409);
  return authJson({error:"OPERATION_REJECTED"},400);
}
function enabled() { return process.env.A1_MOBI_C_LIVE_02_ENABLED==="1"; }

export async function GET(request:Request) {
  if(!enabled()) return authJson({error:"NOT_FOUND"},404);
  try {
    const ctx=await currentStoreContext("repair.manage");
    const params=new URL(request.url).searchParams;
    const rawPage=params.get("page")??"0";
    const q=(params.get("q")??"").trim();
    const status=params.get("status")??"ALL";
    if(!/^(0|[1-9][0-9]{0,3})$/.test(rawPage)||Number(rawPage)>1000||
      q.length>80||!["ALL","ACTIVE","AWAITING","READY","DELIVERED"].includes(status))
      return authJson({error:"INVALID_LIST_FILTER"},400);
    const page=Number(rawPage),pageSize=75;
    const where:Prisma.RepairOrderWhereInput={tenantId:ctx.tenantId,branchId:ctx.branchId};
    if(status==="ACTIVE")where.status={in:[RepairStatus.INTAKE,RepairStatus.DIAGNOSIS,
      RepairStatus.ESTIMATE_PENDING,RepairStatus.APPROVED,RepairStatus.IN_PROGRESS]};
    if(status==="AWAITING")where.status={in:[RepairStatus.ESTIMATE_PENDING,RepairStatus.APPROVED]};
    if(status==="READY")where.status=RepairStatus.READY;
    if(status==="DELIVERED")where.status=RepairStatus.DELIVERED;
    if(q)where.OR=[
      {number:{contains:q,mode:"insensitive"}},
      {customerName:{contains:q,mode:"insensitive"}},
      {deviceDescription:{contains:q,mode:"insensitive"}},
      {reportedIssue:{contains:q,mode:"insensitive"}},
      {imei:{contains:q}},
    ];
    const [rows,matchedCount,totalOrders,cashOpen]=await Promise.all([
      db.repairOrder.findMany({
      where,
      orderBy:[{intakeAt:"desc"},{id:"desc"}],skip:page*pageSize,take:pageSize,
      include:{statusEvents:{orderBy:{occurredAt:"asc"},select:{toStatus:true,occurredAt:true}},
        warranties:{select:{number:true,expiresAt:true,status:true},take:1}},
      }),
      db.repairOrder.count({where}),
      db.repairOrder.count({where:{tenantId:ctx.tenantId,branchId:ctx.branchId}}),
      db.cashSession.findFirst({where:{tenantId:ctx.tenantId,branchId:ctx.branchId,
        status:"OPEN"},select:{id:true}}),
    ]);
    return authJson({cashOpen:Boolean(cashOpen),totalOrders,matchedCount,
      page,pageSize,hasMore:(page+1)*pageSize<matchedCount,
      orders:rows.map(row=>({
      id:row.id,number:row.number,customerName:row.customerName,device:row.deviceDescription,
      issue:row.reportedIssue,imeiLast4:row.imei?.slice(-4)??null,status:row.status,
      estimate:row.estimateAmount===null?null:Number(row.estimateAmount),
      finalPrice:Number(row.finalPrice),paidTotal:Number(row.paidTotal),
      balanceDue:Number(row.balanceDue),intakeAt:row.intakeAt.toISOString(),
      warranty:row.warranties[0]?{number:row.warranties[0].number,
        expiresAt:row.warranties[0].expiresAt.toISOString(),status:row.warranties[0].status}:null,
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
    if(data.action==="openCash"){
      await currentStoreContext("cash.manage");
      const opened=await openCashSession({tenantId:ctx.tenantId,branchId:ctx.branchId,
        actorId:ctx.actorId,openingUsd:data.openingUsd,
        openingLbp:data.openingLbp,openingExchangeRate:data.openingExchangeRate});
      return authJson({cashSessionId:opened.id,status:opened.status},201);
    }
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

    if(data.action==="pay"){
      await currentStoreContext("cash.manage");
      const receipt=await collectRepairCashPayment({tenantId:ctx.tenantId,branchId:ctx.branchId,
        actorId:ctx.actorId,repairOrderId:repair.id,amount:data.amount,
        idempotencyKey:data.idempotencyKey});
      return authJson(receipt,receipt.replayed?200:201);
    }
    if(data.action==="deliver"){
      const result=await deliverSettledRepair({tenantId:ctx.tenantId,branchId:ctx.branchId,
        actorId:ctx.actorId,repairOrderId:repair.id,
        confirmedPickup:data.confirmedPickup,warrantyDays:data.warrantyDays,
        warrantyTerms:data.warrantyTerms});
      return authJson(result,result.replayed?200:201);
    }
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
    if(data.action!=="ready" || repair.status!==RepairStatus.IN_PROGRESS)
      return authJson({error:"STATUS_CONFLICT"},409);
    await finalizeRepairFinancials({tenantId:ctx.tenantId,actorId:ctx.actorId,
      repairOrderId:repair.id,finalPrice:data.finalPrice,laborCost:data.laborCost,directCost:data.directCost});
    const next=await advanceRepair({tenantId:ctx.tenantId,branchId:ctx.branchId,
      actorId:ctx.actorId,repairOrderId:repair.id,toStatus:RepairStatus.READY});
    return authJson({id:next.id,status:next.status});
  } catch(error){return unavailable(error);}
}
