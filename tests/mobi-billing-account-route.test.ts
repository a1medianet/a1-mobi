import {beforeEach,afterEach,describe,expect,it,vi} from "vitest";
const mock=vi.hoisted(()=>({denied:false,tenant:"mobi:test-store-id",read:vi.fn(),write:vi.fn()}));
vi.mock("@/server/mobi-billing-owner",()=>({requireBillingOwner:async()=>{
  if(mock.denied)throw new Error("PERMISSION_DENIED");
  return {billingTenantKey:mock.tenant,tenantId:mock.tenant.slice(5)};
}}));
vi.mock("@/server/auth-http",()=>({
  authJson:(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}}),
  sameOriginMutation:(req:Request)=>req.headers.get("origin")==="http://localhost:3000",
}));
vi.mock("@/server/mobi-billing-account",()=>({
  getMobiBillingAccount:(key:string)=>mock.read(key),
  setMobiAutoRenew:(key:string,value:boolean)=>mock.write(key,value),
}));
import {GET,POST} from "@/app/api/billing/mobi/account/route";
const request=(data:unknown,origin="http://localhost:3000")=>new Request("http://localhost:3000/api/billing/mobi/account",{
  method:"POST",headers:{"content-type":"application/json",origin},body:JSON.stringify(data),
});
const sample={entitlement:{tenantId:"mobi:test-store-id",productKey:"mobi",status:"active"},plan:{interval:"month"},renewal:{autoRenew:true,canChange:true}};
describe("Mobi owner-only customer account",()=>{
  beforeEach(()=>{mock.denied=false;mock.tenant="mobi:test-store-id";mock.read.mockReset().mockResolvedValue(sample);mock.write.mockReset().mockResolvedValue(sample);vi.stubEnv("A1_MOBI_RENEWAL_CONTROL_ENABLED","");});
  afterEach(()=>vi.unstubAllEnvs());
  it("reads the account using session-bound store identity",async()=>{
    expect((await GET()).status).toBe(200);
    expect(mock.read).toHaveBeenCalledWith("mobi:test-store-id");
  });
  it("denies staff/other-store owner",async()=>{
    mock.denied=true;
    expect((await GET()).status).toBe(403);
  });
  it("rejects renewal until the A1Cloud sandbox stage is authorized",async()=>{
    expect((await POST(request({autoRenew:false}))).status).toBe(409);
    expect(mock.write).not.toHaveBeenCalled();
  });
  it("rejects cross-site mutations and injected tenant identities",async()=>{
    expect((await POST(request({autoRenew:false},"https://evil.test"))).status).toBe(403);
    expect((await POST(request({autoRenew:false,tenantId:"mobi:other"}))).status).toBe(400);
  });
  it("requires owner, active monthly plan and Billing canChange before a renewal write",async()=>{
    vi.stubEnv("A1_MOBI_RENEWAL_CONTROL_ENABLED","1");
    mock.denied=true;
    expect((await POST(request({autoRenew:false}))).status).toBe(403);
    mock.denied=false;mock.read.mockResolvedValue({...sample,plan:{interval:"year"}});
    expect((await POST(request({autoRenew:false}))).status).toBe(409);
    expect(mock.write).not.toHaveBeenCalled();
  });
});
