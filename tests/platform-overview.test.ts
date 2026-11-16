import { afterEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({tenants:vi.fn(),tenantCount:vi.fn(),branchCount:vi.fn(),userCount:vi.fn()}));
vi.mock("@/server/db",()=>({db:{tenant:{count:mocks.tenantCount,findMany:mocks.tenants},branch:{count:mocks.branchCount},user:{count:mocks.userCount}}}));
import { readPlatformOverview } from "@/server/platform-overview";
const prev={trial:process.env.A1_MOBI_PUBLIC_TRIAL_ENABLED,billing:process.env.A1_BILLING_CORE_URL,token:process.env.A1_BILLING_SERVICE_TOKEN};
afterEach(()=>{vi.resetAllMocks();for(const [name,key] of [["trial","A1_MOBI_PUBLIC_TRIAL_ENABLED"],["billing","A1_BILLING_CORE_URL"],["token","A1_BILLING_SERVICE_TOKEN"]] as const){const value=prev[name];if(value===undefined)delete process.env[key];else process.env[key]=value;}});
describe("platform overview read-only summary",()=>{
  it("counts across tenants but only selects safe list fields and never writes",async()=>{
    mocks.tenantCount.mockResolvedValue(2);mocks.branchCount.mockResolvedValue(3);mocks.userCount.mockResolvedValue(5);
    mocks.tenants.mockResolvedValue([{id:"t1",name:"Top Mobile",slug:"top-mobile",billingTenantKey:null,_count:{branches:1,users:1,products:0}}]);
    delete process.env.A1_MOBI_PUBLIC_TRIAL_ENABLED;delete process.env.A1_BILLING_CORE_URL;delete process.env.A1_BILLING_SERVICE_TOKEN;
    const snapshot=await readPlatformOverview();
    expect(snapshot).toMatchObject({tenantCount:2,branchCount:3,userCount:5,hasMoreTenants:true,trialSignupEnabled:false,billingConfigured:false});
    expect(mocks.tenants).toHaveBeenCalledWith(expect.objectContaining({take:50,select:expect.objectContaining({id:true,slug:true,name:true})}));
    expect(JSON.stringify(mocks.tenants.mock.calls[0][0])).not.toContain("password");
    expect(JSON.stringify(mocks.tenants.mock.calls[0][0])).not.toContain("totp");
  });
  it("does not mistake configured billing credentials for a verified entitlement",async()=>{
    mocks.tenantCount.mockResolvedValue(0);mocks.branchCount.mockResolvedValue(0);mocks.userCount.mockResolvedValue(0);mocks.tenants.mockResolvedValue([]);
    process.env.A1_MOBI_PUBLIC_TRIAL_ENABLED="1";process.env.A1_BILLING_CORE_URL="https://billing.example.test";process.env.A1_BILLING_SERVICE_TOKEN="secret-test-only";
    const snapshot=await readPlatformOverview();
    expect(snapshot).toMatchObject({tenantCount:0,hasMoreTenants:false,trialSignupEnabled:true,billingConfigured:true});
    expect(snapshot).not.toHaveProperty("entitlementStatus");
  });
});
