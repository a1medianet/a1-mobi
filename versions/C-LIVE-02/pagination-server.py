from pathlib import Path
r=Path(r"C:\A1Hub\a1-mobi")
p=r/"src/app/api/ops/live-02/route.ts"
s=p.read_text(encoding="utf8")
s=s.replace('import { DeviceServiceContext, DeviceTrustResult, RepairStatus } from "@prisma/client";','import { DeviceServiceContext, DeviceTrustResult, RepairStatus, Prisma } from "@prisma/client";',1)
a="""export async function GET() {
  if(!enabled()) return authJson({error:"NOT_FOUND"},404);
  try {
    const ctx=await currentStoreContext("repair.manage");
    const rows=await db.repairOrder.findMany({
      where:{tenantId:ctx.tenantId,branchId:ctx.branchId},
      orderBy:{intakeAt:"desc"},take:75,"""
b="""export async function GET(request?:Request) {
  if(!enabled()) return authJson({error:"NOT_FOUND"},404);
  try {
    const ctx=await currentStoreContext("repair.manage");
    const params=new URL(request?.url??"http://127.0.0.1/api/ops/live-02").searchParams;
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
      orderBy:[{intakeAt:"desc"},{id:"desc"}],skip:page*pageSize,take:pageSize,"""
assert s.count(a)==1,s.count(a)
s=s.replace(a,b,1)
a="""    const cashOpen=Boolean(await db.cashSession.findFirst({where:{
      tenantId:ctx.tenantId,branchId:ctx.branchId,status:"OPEN"},select:{id:true}}));
    const totalOrders=await db.repairOrder.count({
      where:{tenantId:ctx.tenantId,branchId:ctx.branchId},
    });
    return authJson({cashOpen,totalOrders,orders:rows.map(row=>({"""
b="""      db.repairOrder.count({where}),
      db.repairOrder.count({where:{tenantId:ctx.tenantId,branchId:ctx.branchId}}),
      db.cashSession.findFirst({where:{tenantId:ctx.tenantId,branchId:ctx.branchId,
        status:"OPEN"},select:{id:true}}),
    ]);
    return authJson({cashOpen:Boolean(cashOpen),totalOrders,matchedCount,
      page,pageSize,hasMore:(page+1)*pageSize<matchedCount,
      orders:rows.map(row=>({"""
assert s.count(a)==1
s=s.replace(a,b,1)
# findMany closes before Promise entries; original end "});" after include. Must turn to "}),"
a="""        warranties:{select:{number:true,expiresAt:true,status:true},take:1}},
    });"""
b="""        warranties:{select:{number:true,expiresAt:true,status:true},take:1}},
      }),"""
assert s.count(a)==1
s=s.replace(a,b,1)
p.write_text(s,encoding="utf8",newline="\n")
print("REPAIR_LIVE_SERVER_FILTER_PAGINATION_READY")
