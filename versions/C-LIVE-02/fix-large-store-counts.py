from pathlib import Path
r=Path(r"C:\A1Hub\a1-mobi")
route=r/"src/app/api/ops/live-02/route.ts"
s=route.read_text(encoding="utf8")
a='''    const cashOpen=Boolean(await db.cashSession.findFirst({where:{
      tenantId:ctx.tenantId,branchId:ctx.branchId,status:"OPEN"},select:{id:true}}));
    return authJson({cashOpen,orders:rows.map(row=>({'''
b='''    const cashOpen=Boolean(await db.cashSession.findFirst({where:{
      tenantId:ctx.tenantId,branchId:ctx.branchId,status:"OPEN"},select:{id:true}}));
    const totalOrders=await db.repairOrder.count({
      where:{tenantId:ctx.tenantId,branchId:ctx.branchId},
    });
    return authJson({cashOpen,totalOrders,orders:rows.map(row=>({'''
if a in s: route.write_text(s.replace(a,b),encoding="utf8",newline="\n")
else: assert b in s
ui=r/"src/components/repair-live-operations.tsx"
s=ui.read_text(encoding="utf8")
pairs=[
('   total:"الطلبات المعروضة",activeTotal:', '   total:"الطلبات المعروضة",moreRows:"نعرض أحدث 75 طلبًا فقط. للبحث في الطلبات الأقدم نحتاج إلى تصفح جميع السجلات.",activeTotal:'),
('   total:"Listed tickets",activeTotal:', '   total:"Listed tickets",moreRows:"Showing the latest 75 repairs only. Older records require full-history search.",activeTotal:'),
(' const [cashOpen,setCashOpen]=useState(false);',' const [cashOpen,setCashOpen]=useState(false);\\n const [totalOrders,setTotalOrders]=useState(0);'),
('  setOrders(data.orders as Order[]);setCashOpen(Boolean(data.cashOpen));','  setOrders(data.orders as Order[]);setCashOpen(Boolean(data.cashOpen));setTotalOrders(Number(data.totalOrders??data.orders.length));'),
('if(active){setOrders(data.orders as Order[]);setCashOpen(Boolean(data.cashOpen));}','if(active){setOrders(data.orders as Order[]);setCashOpen(Boolean(data.cashOpen));setTotalOrders(Number(data.totalOrders??data.orders.length));}'),
('    <div><h2>{t.orders}</h2><p>{visibleOrders.length} / {orders.length}</p></div>','    <div><h2>{t.orders}</h2><p>{visibleOrders.length} / {totalOrders}</p></div>'),
]
for a,b in pairs:
 assert s.count(a)==1,(a,s.count(a))
 s=s.replace(a,b,1)
# replace literal escaped newline from one substitution
s=s.replace('useState(false);\\n const [totalOrders', 'useState(false);\n const [totalOrders')
target='   {loading?<p className="module-sub">'
assert s.count(target)==1
s=s.replace(target,'   {totalOrders>orders.length?<p role="note" className="module-sub">{t.moreRows}</p>:null}\n'+target,1)
ui.write_text(s,encoding="utf8",newline="\n")
print("SCOPED_COUNT_AND_75_LIMIT_DISCLOSURE_FIXED")
