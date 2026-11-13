from pathlib import Path
p=Path(r"C:\A1Hub\a1-mobi\tests\c-live-02-route-db.test.ts")
s=p.read_text(encoding="utf8")
key=' it("does not deliver unpaid repair or take cash without open till; records payment exactly once",async()=>{'
assert s.count(key)==1
insert=''' it("paginates entire scoped history and searches tenant/branch records on server",async()=>{
  active=a;
  const prefix="ARCHIVE-"+randomUUID().slice(0,8)+"-";
  const synthetic=Array.from({length:77},(_,index)=>({
   tenantId:a.tenantId,branchId:a.branchId,createdById:a.actorId,
   number:prefix+index,customerName:"Synthetic Archive Customer "+index,
   customerPhone:"+96170000000",deviceDescription:"UAT Archive Device "+index,
   condition:"Used",reportedIssue:"Synthetic archived battery issue",
   accessories:[],status:"INTAKE" as const,
  }));
  await db.repairOrder.createMany({data:synthetic});
  try {
   const url=base+"/api/ops/live-02";
   const first=await (await route.GET(new Request(url+"?page=0"))).json();
   const second=await (await route.GET(new Request(url+"?page=1"))).json();
   expect(first.orders).toHaveLength(75);
   expect(first.pageSize).toBe(75);
   expect(first.hasMore).toBe(true);
   expect(second.orders.length).toBeGreaterThan(0);
   expect(new Set([...first.orders,...second.orders].map((row:{id:string})=>row.id)).size)
    .toBe(first.orders.length+second.orders.length);
   const search=await (await route.GET(new Request(url+"?q="+encodeURIComponent(prefix+"76")))).json();
   expect(search.matchedCount).toBe(1);
   expect(search.orders[0].number).toBe(prefix+"76");
   const ready=await (await route.GET(new Request(url+"?status=READY"))).json();
   expect(ready.orders.some((row:{id:string})=>row.id===repairId)).toBe(true);
   expect((await route.GET(new Request(url+"?page=-1"))).status).toBe(400);
   expect((await route.GET(new Request(url+"?status=NONE"))).status).toBe(400);
   expect((await route.GET(new Request(url+"?q="+"x".repeat(81)))).status).toBe(400);
   active=b;
   const other=await (await route.GET(new Request(url+"?q="+encodeURIComponent(prefix)))).json();
   expect(other.matchedCount).toBe(0);
   expect(other.orders).toHaveLength(0);
  } finally {
   active=a;
   await db.repairOrder.deleteMany({where:{tenantId:a.tenantId,number:{startsWith:prefix}}});
  }
 },90000);

'''
s=s.replace(key,insert+key,1)
p.write_text(s,encoding="utf8",newline="\n")
print("SERVER_HISTORY_77_PLUS_PAGE_TEST_ADDED")
