import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
const mock=vi.hoisted(()=>({
  ctx: { tenantId:"top-mobile-id",actorId:"top-owner" } as {tenantId:string;actorId:string}|null,
  tenants: new Map<string,string|null>([["top-mobile-id","mobi:top-mobile-legacy"],["other-store-id",null]]),
  owners: new Map<string,string>([["top-mobile-id","top-owner"],["other-store-id","other-owner"]]),
  lastTenantQuery: null as unknown,
  lastUserQuery: null as unknown,
}));
vi.mock("@/server/auth-http",()=>({
  currentStoreContext:async()=>mock.ctx,
}));
vi.mock("@/server/db",()=>({
  db:{
    tenant:{findUnique:async(query:{where:{id:string}})=>{
      mock.lastTenantQuery=query;
      return mock.tenants.has(query.where.id)?{id:query.where.id,billingTenantKey:mock.tenants.get(query.where.id)}:null;
    }},
    user:{findFirst:async(query:{where:{id:string;tenantId:string;isActive:boolean;userRoles:{some:{role:{tenantId:string;code:string}}}}})=>{
      mock.lastUserQuery=query;
      const w=query.where;
      return mock.owners.get(w.tenantId)===w.id &&
        w.userRoles.some.role.tenantId===w.tenantId &&
        w.userRoles.some.role.code==="owner" && w.isActive
        ? {id:w.id,email:"owner@"+w.tenantId+".test"} : null;
    }},
  }
}));
import {requireBillingOwner} from "@/server/mobi-billing-owner";
describe("Billing owner resolution and stable store identity",()=>{
  beforeEach(()=>{mock.ctx={tenantId:"top-mobile-id",actorId:"top-owner"};});
  afterEach(()=>vi.restoreAllMocks());
  it("keeps legacy Top Mobile key rather than silently losing prior subscription",async()=>{
    const result=await requireBillingOwner();
    expect(result.billingTenantKey).toBe("mobi:top-mobile-legacy");
    expect(mock.lastTenantQuery).toMatchObject({where:{id:"top-mobile-id"}});
    expect(mock.lastUserQuery).toMatchObject({where:{
      id:"top-owner",tenantId:"top-mobile-id",
      userRoles:{some:{role:{tenantId:"top-mobile-id",code:"owner"}}},
    }});
  });
  it("uses immutable internal identifier for new stores",async()=>{
    mock.ctx={tenantId:"other-store-id",actorId:"other-owner"};
    expect((await requireBillingOwner()).billingTenantKey).toBe("mobi:other-store-id");
  });
  it("blocks another store owner and staff in Top Mobile",async()=>{
    mock.ctx={tenantId:"top-mobile-id",actorId:"other-owner"};
    await expect(requireBillingOwner()).rejects.toThrow("PERMISSION_DENIED");
    mock.ctx={tenantId:"top-mobile-id",actorId:"staff-member"};
    await expect(requireBillingOwner()).rejects.toThrow("PERMISSION_DENIED");
  });
  it("rejects an unauthenticated session",async()=>{
    mock.ctx=null;
    await expect(requireBillingOwner()).rejects.toThrow("AUTH_REQUIRED");
  });
});
