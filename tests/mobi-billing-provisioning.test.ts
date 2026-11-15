import {beforeEach,describe,expect,it,vi} from "vitest";
const mock=vi.hoisted(()=>({
  duplicate:false,
  createData:null as unknown,
  updateData:null as unknown,
  auditData:null as unknown,
}));
const tx={
  tenant:{
    findFirst:async()=>mock.duplicate?{id:"old"}:null,
    create:async({data}:{data:unknown})=>{mock.createData=data;return {id:"cuid-internal-123",slug:"top-mobile",a1AccountId:null,a1OrganizationId:null};},
    update:async(args:unknown)=>{mock.updateData=args;return {};},
  },
  permission:{createMany:async()=>({}),findMany:async()=>[{id:"p1"}]},
  branch:{create:async()=>({id:"branch-one"})},
  user:{create:async()=>({id:"owner-one",email:"owner@example.test"})},
  role:{create:async()=>({id:"role-one"})},
  rolePermission:{createMany:async()=>({})},
  userRole:{create:async()=>({})},
  auditEvent:{create:async({data}:{data:unknown})=>{mock.auditData=data;return {};}},
};
vi.mock("@/server/db",()=>({db:{$transaction:async(fn:(arg:typeof tx)=>unknown)=>fn(tx)}}));
vi.mock("@/core/auth/password",()=>({hashPassword:async()=>"hash"}));
vi.mock("@/core/rbac/permission-seeds",()=>({PERMISSION_SEEDS:[{code:"foundation.manage"}]}));
import {bootstrapStore} from "@/server/bootstrap-service";
const input={tenantSlug:"top-mobile",tenantName:"Top Mobile",branchCode:"MAIN",branchName:"Main",ownerEmail:"owner@example.test",ownerDisplayName:"Owner",ownerPassword:"long-and-strong-password",locale:"ar" as const};

describe("billing tenant key during provisioning",()=>{
  beforeEach(()=>{mock.duplicate=false;mock.createData=null;mock.updateData=null;mock.auditData=null;});
  it("persists an immutable internal ID, not a mutable tenant slug",async()=>{
    const output=await bootstrapStore(input);
    expect(output.tenantId).toBe("cuid-internal-123");
    expect(output.billingTenantKey).toBe("mobi:cuid-internal-123");
    expect(mock.updateData).toEqual({where:{id:"cuid-internal-123"},data:{billingTenantKey:"mobi:cuid-internal-123"}});
    expect(mock.createData).not.toHaveProperty("billingTenantKey");
    expect(mock.auditData).toMatchObject({after:{billingTenantKey:"mobi:cuid-internal-123"}});
  });
  it("blocks duplicate slug provisioning",async()=>{
    mock.duplicate=true;
    await expect(bootstrapStore(input)).rejects.toThrow("CONFLICT");
  });
});
