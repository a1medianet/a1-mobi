from pathlib import Path
p=Path(r"C:\A1Hub\a1-mobi\src\app\api\ops\live-02\route.ts")
s=p.read_text(encoding="utf8")
def replace(a,b):
 global s
 if s.count(a)!=1:raise ValueError((a,s.count(a)))
 s=s.replace(a,b,1)
replace('import { DeviceServiceContext, DeviceTrustResult, RepairStatus } from "@prisma/client";',
        'import { DeviceServiceContext, DeviceTrustResult, RepairStatus } from "@prisma/client";\nimport { openCashSession } from "@/modules/cash/cash-service";\nimport { collectRepairCashPayment,deliverSettledRepair } from "@/modules/repairs/repair-live-settlement";')
replace('  z.object({action:z.literal("ready"),repairId:id,finalPrice:money.positive(),\n    laborCost:money,directCost:money}).strict(),',
'''  z.object({action:z.literal("ready"),repairId:id,finalPrice:money.positive(),
    laborCost:money,directCost:money}).strict(),
  z.object({action:z.literal("openCash"),openingUsd:money,
    openingLbp:money,openingExchangeRate:money.positive()}).strict(),
  z.object({action:z.literal("pay"),repairId:id,amount:money.positive(),
    idempotencyKey:z.string().uuid()}).strict(),
  z.object({action:z.literal("deliver"),repairId:id,confirmedPickup:z.literal(true),
    warrantyDays:z.number().int().min(1).max(365),warrantyTerms:z.string().trim().min(5).max(1000)}).strict(),''')
replace('  return authJson({error:"OPERATION_REJECTED"},400);',
'''  if (code === "REPAIR_NOT_FOUND") return authJson({error:"NOT_FOUND"},404);
  if (["OVERPAYMENT_REJECTED","PAYMENT_KEY_CONFLICT","OPEN_CASH_SESSION_REQUIRED",
    "REPAIR_NOT_READY_FOR_PAYMENT","UNPAID_REPAIR_CANNOT_BE_DELIVERED",
    "INVALID_CASH_AMOUNT","PICKUP_CONFIRMATION_REQUIRED","DELIVERED_WARRANTY_MISSING"]
    .includes(code))return authJson({error:code},409);
  if (code.includes("already has an open cash session")||code==="P2034")
    return authJson({error:"CASH_CONFLICT_RETRY"},409);
  return authJson({error:"OPERATION_REJECTED"},400);''')
replace('      include:{statusEvents:{orderBy:{occurredAt:"asc"},select:{toStatus:true,occurredAt:true}}},',
'''      include:{statusEvents:{orderBy:{occurredAt:"asc"},select:{toStatus:true,occurredAt:true}}},
        warranties:{select:{number:true,expiresAt:true,status:true},take:1}},
'''.rstrip('\n'))
replace('    return authJson({orders:rows.map(row=>({',
'''    const cashOpen=Boolean(await db.cashSession.findFirst({where:{
      tenantId:ctx.tenantId,branchId:ctx.branchId,status:"OPEN"},select:{id:true}}));
    return authJson({cashOpen,orders:rows.map(row=>({''')
replace('      balanceDue:Number(row.balanceDue),intakeAt:row.intakeAt.toISOString(),',
'''      balanceDue:Number(row.balanceDue),intakeAt:row.intakeAt.toISOString(),
      warranty:row.warranties[0]?{number:row.warranties[0].number,
        expiresAt:row.warranties[0].expiresAt.toISOString(),status:row.warranties[0].status}:null,''')
replace('    const data=input.data;\n    if(data.action==="intake"){',
'''    const data=input.data;
    if(data.action==="openCash"){
      await currentStoreContext("cash.manage");
      const opened=await openCashSession({tenantId:ctx.tenantId,branchId:ctx.branchId,
        actorId:ctx.actorId,openingUsd:data.openingUsd,
        openingLbp:data.openingLbp,openingExchangeRate:data.openingExchangeRate});
      return authJson({cashSessionId:opened.id,status:opened.status},201);
    }
    if(data.action==="intake"){''')
replace('    if(data.action==="estimate"){',
'''    if(data.action==="pay"){
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
    if(data.action==="estimate"){''')
replace('    if(repair.status!==RepairStatus.IN_PROGRESS)return authJson({error:"STATUS_CONFLICT"},409);',
'''    if(data.action!=="ready" || repair.status!==RepairStatus.IN_PROGRESS)
      return authJson({error:"STATUS_CONFLICT"},409);''')
p.write_text(s,encoding="utf8",newline="\n")
print("C-LIVE-02 PAYMENT/CASH/DELIVERY ROUTE IMPLEMENTED")
