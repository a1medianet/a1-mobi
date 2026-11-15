import {describe,expect,it} from "vitest";
import {featureEnabled,mobiEntitlementLimit,type MobiEntitlementSnapshot} from "@/server/billing-client";
const make=(expiresAt:string,status="trialing"):MobiEntitlementSnapshot=>({
  tenantId:"mobi:top-mobile-id",productKey:"mobi",status,planCode:"mobi-pilot",expiresAt,
  features:{"mobi.access":"true","mobi.users":"5","mobi.branches":"1"},
});
describe("Mobi expiry and Billing plan limits",()=>{
  it("uses the central Billing feature names for staff/branches",()=>{
    const s=make(new Date(Date.now()+86_400_000).toISOString());
    expect(featureEnabled(s,"mobi.access")).toBe(true);
    expect(mobiEntitlementLimit(s,"users")).toBe(5);
    expect(mobiEntitlementLimit(s,"branches")).toBe(1);
  });
  it("removes all access on trial expiration even with a stale feature cache",()=>{
    const s=make(new Date(Date.now()-1_000).toISOString());
    expect(featureEnabled(s,"mobi.access")).toBe(false);
    expect(mobiEntitlementLimit(s,"users")).toBe(0);
    expect(mobiEntitlementLimit(s,"branches")).toBe(0);
  });
  it("does not enable unpaid or suspended plans",()=>{
    const s=make(new Date(Date.now()+86_400_000).toISOString(),"suspended");
    expect(featureEnabled(s,"mobi.access")).toBe(false);
    expect(mobiEntitlementLimit(s,"users")).toBe(0);
  });
  it("preserves legacy feature naming during migrations",()=>{
    const s=make(new Date(Date.now()+86_400_000).toISOString(),"active");
    s.features={"staff.max":"3","branches.max":"2"};
    expect(mobiEntitlementLimit(s,"users")).toBe(3);
    expect(mobiEntitlementLimit(s,"branches")).toBe(2);
  });
});
