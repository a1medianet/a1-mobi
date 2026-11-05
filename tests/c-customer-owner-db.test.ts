import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { db } from "@/server/db";
import { registerCustomer } from "@/modules/customers/customer-service";
import { getBranchCustomerDirectory } from "@/modules/customers/customer-owner-directory";

const runDb=process.env.DATABASE_URL?describe:describe.skip;

runDb("C-13 owner customers isolated PostgreSQL directory",()=>{
  it("separates registered customer profiles by tenant AND branch",async()=>{
    const suffix=randomUUID().slice(0,8);
    const tenant=await db.tenant.create({data:{slug:"c13-customer-"+suffix,name:"C13 customer UAT"}});
    const another=await db.tenant.create({data:{slug:"c13-other-"+suffix,name:"C13 other UAT"}});
    const b1=await db.branch.create({data:{tenantId:tenant.id,code:"A",name:"Branch A"}});
    const b2=await db.branch.create({data:{tenantId:tenant.id,code:"B",name:"Branch B"}});
    const otherBranch=await db.branch.create({data:{tenantId:another.id,code:"A",name:"Other tenant"}});
    const actor=await db.user.create({data:{tenantId:tenant.id,branchId:b1.id,
      email:"owner-"+suffix+"@example.test",displayName:"Owner",passwordHash:"uat-only"}});
    const otherActor=await db.user.create({data:{tenantId:another.id,branchId:otherBranch.id,
      email:"other-"+suffix+"@example.test",displayName:"Other",passwordHash:"uat-only"}});
    const a=await registerCustomer({tenantId:tenant.id,branchId:b1.id,actorId:actor.id,
      name:"Synthetic Customer A",phone:"+9617000"+suffix.slice(0,4)});
    const b=await registerCustomer({tenantId:tenant.id,branchId:b2.id,actorId:actor.id,
      name:"Synthetic Customer B",phone:"+9617100"+suffix.slice(0,4)});
    const c=await registerCustomer({tenantId:another.id,branchId:otherBranch.id,actorId:otherActor.id,
      name:"Synthetic Other Tenant",phone:"+9617200"+suffix.slice(0,4)});
    const first=await getBranchCustomerDirectory({tenantId:tenant.id,branchId:b1.id});
    const second=await getBranchCustomerDirectory({tenantId:tenant.id,branchId:b2.id});
    const foreign=await getBranchCustomerDirectory({tenantId:another.id,branchId:otherBranch.id});
    expect(first.customers.some(x=>x.id===a.id)).toBe(true);
    expect(first.customers.some(x=>x.id===b.id||x.id===c.id)).toBe(false);
    expect(second.customers.some(x=>x.id===b.id)).toBe(true);
    expect(second.customers.some(x=>x.id===a.id||x.id===c.id)).toBe(false);
    expect(foreign.customers.some(x=>x.id===c.id)).toBe(true);
    expect(foreign.customers.some(x=>x.id===a.id||x.id===b.id)).toBe(false);
    expect(first.total).toBe(1);
    expect(second.total).toBe(1);
    expect(foreign.total).toBe(1);
  },45_000);
});
