import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {getMobiBillingAccount,setMobiAutoRenew} from "@/server/mobi-billing-account";
const fetchMock=vi.fn<typeof fetch>();
const account=(tenantId="mobi:test-store-id")=>({
  entitlement:{tenantId,productKey:"mobi",status:"trialing",planCode:"mobi-pilot",expiresAt:"2030-01-01T00:00:00.000Z",features:{"mobi.access":"true"}},
  plan:{name:"Mobi Pilot",currency:"USD",amountMinor:0,interval:"day"},
  renewal:{autoRenew:null,canChange:false},
});
describe("Mobi scoped customer account API",()=>{
  beforeEach(()=>{
    vi.stubEnv("A1_BILLING_CORE_URL","https://billing.test");
    vi.stubEnv("A1_BILLING_MOBI_ACCOUNT_TOKEN","account-secret-only");
    vi.stubEnv("A1_BILLING_SERVICE_TOKEN","separate-service-secret");
    vi.stubGlobal("fetch",fetchMock);fetchMock.mockReset();
  });
  afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
  it("GET uses only scoped token and the store's stable key",async()=>{
    fetchMock.mockResolvedValue(Response.json(account()));
    const result=await getMobiBillingAccount("mobi:test-store-id");
    expect(result.entitlement.status).toBe("trialing");
    const [url,init]=fetchMock.mock.calls[0];
    expect(url).toBe("https://billing.test/api/customer/account?tenant=mobi%3Atest-store-id&product=mobi");
    expect(init?.headers).toMatchObject({authorization:"Bearer account-secret-only"});
    expect(init?.cache).toBe("no-store");
  });
  it("rejects a response for another store or product",async()=>{
    fetchMock.mockResolvedValue(Response.json(account("mobi:other")));
    await expect(getMobiBillingAccount("mobi:test-store-id")).rejects.toThrow("BILLING_ACCOUNT_SCOPE_MISMATCH");
  });
  it("fails closed without scoped token",async()=>{
    vi.stubEnv("A1_BILLING_MOBI_ACCOUNT_TOKEN","");
    await expect(getMobiBillingAccount("mobi:test-store-id")).rejects.toThrow("A1_BILLING_ACCOUNT_NOT_CONFIGURED");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("POST renewal uses scoped token and confirms the account with a subsequent GET",async()=>{
    fetchMock.mockResolvedValueOnce(Response.json({renewal:{autoRenew:false,canChange:true}}));
    fetchMock.mockResolvedValueOnce(Response.json({...account(),entitlement:{...account().entitlement,status:"active",planCode:"mobi-monthly"},renewal:{autoRenew:false,canChange:true}}));
    const result=await setMobiAutoRenew("mobi:test-store-id",false);
    expect(result.renewal.autoRenew).toBe(false);
    expect(fetchMock.mock.calls[0][0]).toBe("https://billing.test/api/customer/account");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({tenantId:"mobi:test-store-id",productKey:"mobi",autoRenew:false});
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("does not claim success when Billing fails to confirm renewal",async()=>{
    fetchMock.mockResolvedValue(Response.json({renewal:{autoRenew:true,canChange:true}}));
    await expect(setMobiAutoRenew("mobi:test-store-id",false)).rejects.toThrow("RENEWAL_NOT_CONFIRMED");
  });
});
