import { randomUUID } from "node:crypto";
import { SaleStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
import { db } from "@/server/db";
import { getBranchOperatingReport } from "@/modules/reports/branch-operating-report";

const runDb=process.env.DATABASE_URL?describe:describe.skip;
runDb("C-13 branch reports PostgreSQL isolation",()=>{
  it("scopes recorded sales and posted refunds by tenant and branch",async()=>{
    const id=randomUUID().slice(0,8);
    const t=await db.tenant.create({data:{slug:"c13-report-"+id,name:"Report UAT"}});
    const foreign=await db.tenant.create({data:{slug:"c13-report-other-"+id,name:"Other report UAT"}});
    const b1=await db.branch.create({data:{tenantId:t.id,code:"A",name:"A"}});
    const b2=await db.branch.create({data:{tenantId:t.id,code:"B",name:"B"}});
    const b3=await db.branch.create({data:{tenantId:foreign.id,code:"A",name:"Other A"}});
    const u=await db.user.create({data:{tenantId:t.id,branchId:b1.id,
      email:"report-"+id+"@example.test",displayName:"Test",passwordHash:"uat-only"}});
    const u3=await db.user.create({data:{tenantId:foreign.id,branchId:b3.id,
      email:"report-other-"+id+"@example.test",displayName:"Test",passwordHash:"uat-only"}});
    const createSale=async(tenantId:string,branchId:string,actorId:string,total:number,tag:string)=>
      db.sale.create({data:{tenantId,branchId,actorId,number:"C13-"+tag+"-"+id,
        status:SaleStatus.COMPLETED,subtotal:total,total,idempotencyKey:randomUUID()}});
    const a=await createSale(t.id,b1.id,u.id,200,"one");
    await createSale(t.id,b2.id,u.id,900,"two");
    await createSale(foreign.id,b3.id,u3.id,500,"foreign");
    await db.saleReturn.create({data:{tenantId:t.id,branchId:b1.id,saleId:a.id,actorId:u.id,
      number:"C13-RET-"+id,reason:"Synthetic UAT refund",refundBase:50,
      idempotencyKey:randomUUID(),status:"POSTED"}});
    const now=new Date(Date.now()+60_000);
    const first=await getBranchOperatingReport({tenantId:t.id,branchId:b1.id,now});
    const second=await getBranchOperatingReport({tenantId:t.id,branchId:b2.id,now});
    const third=await getBranchOperatingReport({tenantId:foreign.id,branchId:b3.id,now});
    expect(first.grossRecordedSalesUsd).toBe(200);
    expect(first.postedReturnsUsd).toBe(50);
    expect(first.salesAfterReturnsUsd).toBe(150);
    expect(first.saleCount).toBe(1);
    expect(second.grossRecordedSalesUsd).toBe(900);
    expect(second.postedReturnsUsd).toBe(0);
    expect(third.grossRecordedSalesUsd).toBe(500);
    expect(third.postedReturnsUsd).toBe(0);
  },50_000);
});
