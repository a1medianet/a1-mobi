from pathlib import Path
r=Path(r"C:\A1Hub\a1-mobi")
p=r/"src/app/api/ops/live-02/route.ts"
s=p.read_text(encoding="utf8")
old='''    const [rows,matchedCount,totalOrders,cashOpen]=await Promise.all(['''
new='''    const [rows,matchedCount,statusTotals,cashOpen]=await Promise.all(['''
assert s.count(old)==1
s=s.replace(old,new,1)
old='''      db.repairOrder.count({where:{tenantId:ctx.tenantId,branchId:ctx.branchId}}),'''
new='''      db.repairOrder.groupBy({
        by:["status"],where:{tenantId:ctx.tenantId,branchId:ctx.branchId},
        _count:{_all:true},_sum:{balanceDue:true},
      }),'''
assert s.count(old)==1
s=s.replace(old,new,1)
old='''    return authJson({cashOpen:Boolean(cashOpen),totalOrders,matchedCount,
      page,pageSize,hasMore:(page+1)*pageSize<matchedCount,''';
new='''    const activeStates=new Set<RepairStatus>([
      RepairStatus.INTAKE,RepairStatus.DIAGNOSIS,RepairStatus.ESTIMATE_PENDING,
      RepairStatus.APPROVED,RepairStatus.IN_PROGRESS,
    ]);
    const totalOrders=statusTotals.reduce((sum,row)=>sum+row._count._all,0);
    const overview={
      total:totalOrders,
      active:statusTotals.filter(row=>activeStates.has(row.status))
        .reduce((sum,row)=>sum+row._count._all,0),
      ready:statusTotals.find(row=>row.status===RepairStatus.READY)?._count._all??0,
      balanceDue:Math.round(Number(statusTotals.find(row=>row.status===RepairStatus.READY)
        ?._sum.balanceDue??0)*100)/100,
    };
    return authJson({cashOpen:Boolean(cashOpen),totalOrders,matchedCount,overview,
      page,pageSize,hasMore:(page+1)*pageSize<matchedCount,''';
assert s.count(old)==1
s=s.replace(old,new,1)
p.write_text(s,encoding="utf8",newline="\n")

p=r/"src/components/repair-live-operations.tsx"
s=p.read_text(encoding="utf8")
old='''import { summarizeRepairs, type RepairListFilter } from "@/modules/repairs/repair-owner-view";'''
new='''import type { RepairListFilter } from "@/modules/repairs/repair-owner-view";'''
assert s.count(old)==1
s=s.replace(old,new,1)
s=s.replace('total:"الطلبات المعروضة"','total:"إجمالي طلبات الفرع"',1)
s=s.replace('total:"Listed tickets"','total:"Branch repair orders"',1)
old=''' const [totalOrders,setTotalOrders]=useState(0);'''
new=''' const [totalOrders,setTotalOrders]=useState(0);
 const [overview,setOverview]=useState({total:0,active:0,ready:0,balanceDue:0});'''
assert s.count(old)==1
s=s.replace(old,new,1)
assert s.count(' const overview=summarizeRepairs(orders);')==1
s=s.replace(' const overview=summarizeRepairs(orders);\n','',1)
old='''   orders:Order[];cashOpen:boolean;totalOrders:number;matchedCount:number;hasMore:boolean;
 }){
  setOrders(data.orders);setCashOpen(Boolean(data.cashOpen));
  setTotalOrders(Number(data.totalOrders));setMatchedCount(Number(data.matchedCount));'''
new='''   orders:Order[];cashOpen:boolean;totalOrders:number;matchedCount:number;hasMore:boolean;
   overview:{total:number;active:number;ready:number;balanceDue:number};
 }){
  setOrders(data.orders);setCashOpen(Boolean(data.cashOpen));
  setOverview(data.overview);
  setTotalOrders(Number(data.totalOrders));setMatchedCount(Number(data.matchedCount));'''
assert s.count(old)==1
s=s.replace(old,new,1)
p.write_text(s,encoding="utf8",newline="\n")

p=r/"tests/c-live-02-route-db.test.ts"
s=p.read_text(encoding="utf8")
needle='''   expect(first.orders).toHaveLength(75);
   expect(first.pageSize).toBe(75);'''
repl='''   expect(first.orders).toHaveLength(75);
   expect(first.overview.total).toBe(first.totalOrders);
   expect(first.overview.active).toBeGreaterThanOrEqual(77);
   expect(first.pageSize).toBe(75);'''
assert s.count(needle)==1
s=s.replace(needle,repl,1)
needle='''   expect(search.matchedCount).toBe(1);
   expect(search.orders[0].number).toBe(prefix+"76");'''
repl='''   expect(search.matchedCount).toBe(1);
   expect(search.orders[0].number).toBe(prefix+"76");
   expect(search.overview.total).toBe(first.overview.total);
   expect(search.overview.active).toBe(first.overview.active);'''
assert s.count(needle)==1
s=s.replace(needle,repl,1)
needle='''   expect(other.matchedCount).toBe(0);
   expect(other.orders).toHaveLength(0);'''
repl='''   expect(other.matchedCount).toBe(0);
   expect(other.orders).toHaveLength(0);
   expect(other.overview.total).toBe(other.totalOrders);
   expect(other.overview.total).toBe(0);'''
assert s.count(needle)==1
s=s.replace(needle,repl,1)
p.write_text(s,encoding="utf8",newline="\n")
print("BRANCH_GLOBAL_KPI_FROM_AUTHENTICATED_STATUS_GROUPS_APPLIED")
