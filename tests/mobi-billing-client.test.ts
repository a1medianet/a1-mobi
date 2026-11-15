import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {createMobiCheckout,getMobiEntitlements,startMobiTrial} from "@/server/billing-client";

const fetchMock=vi.fn<typeof fetch>();
describe("Billing server-to-server client",()=>{
  beforeEach(()=>{
    vi.stubEnv("A1_BILLING_CORE_URL","https://billing.test");
    vi.stubEnv("A1_BILLING_CHECKOUT_ORIGIN","https://billing.test");
    vi.stubEnv("A1_BILLING_SERVICE_TOKEN","server-secret-only");
    vi.stubGlobal("fetch",fetchMock);
    fetchMock.mockReset();
  });
  afterEach(()=>vi.unstubAllGlobals());

  it("posts card-free trial using the stable tenant key and bearer token",async()=>{
    fetchMock.mockResolvedValue(Response.json({entitlement:{tenantId:"mobi:internal-id",productKey:"mobi",status:"trialing",expiresAt:"2030-01-01T00:00:00Z",features:{"mobi.access":"true"}}},{status:201}));
    await startMobiTrial("mobi:internal-id");
    const [url,init]=fetchMock.mock.calls[0];
    expect(url).toBe("https://billing.test/api/trials");
    expect(init?.headers).toMatchObject({authorization:"Bearer server-secret-only"});
    expect(JSON.parse(String(init?.body))).toEqual({tenantId:"mobi:internal-id",productKey:"mobi",planCode:"mobi-pilot"});
  });

  it("fetches tenant-scoped entitlements and does not cache status",async()=>{
    fetchMock.mockResolvedValue(Response.json({tenantId:"mobi:top-mobile",status:"active",features:{"mobi.access":"true"}}));
    await getMobiEntitlements("mobi:top-mobile");
    expect(fetchMock.mock.calls[0][0]).toBe("https://billing.test/api/entitlements?tenant=mobi%3Atop-mobile&product=mobi");
    expect(fetchMock.mock.calls[0][1]?.cache).toBe("no-store");
  });

  it("accepts only the A1 Mobi checkout on the configured Billing origin",async()=>{
    fetchMock.mockResolvedValue(Response.json({checkoutId:"req123",checkoutUrl:"https://billing.test/checkout/mobi?r=req123"},{status:201}));
    const result=await createMobiCheckout({tenantId:"mobi:top",planCode:"mobi-annual",email:"owner@example.test",returnUrl:"https://mobi.test/ar/account?billing=return"});
    expect(result.checkoutId).toBe("req123");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({tenantId:"mobi:top",productKey:"mobi",planCode:"mobi-annual",email:"owner@example.test"});
    const headers=fetchMock.mock.calls[0][1]?.headers as Record<string,string>;
    expect(headers.authorization).toBe("Bearer server-secret-only");
  });

  it("rejects foreign or mismatched checkout redirects",async()=>{
    fetchMock.mockResolvedValue(Response.json({checkoutId:"a",checkoutUrl:"https://evil.test/checkout/mobi?r=a"}));
    await expect(createMobiCheckout({tenantId:"mobi:top",planCode:"mobi-monthly",email:"owner@example.test",returnUrl:"https://mobi.test/ar/account"})).rejects.toThrow("CHECKOUT_URL_INVALID");
    fetchMock.mockResolvedValue(Response.json({checkoutId:"a",checkoutUrl:"https://billing.test/checkout/count?r=a"}));
    await expect(createMobiCheckout({tenantId:"mobi:top",planCode:"mobi-monthly",email:"owner@example.test",returnUrl:"https://mobi.test/ar/account"})).rejects.toThrow("CHECKOUT_URL_INVALID");
  });

  it("fails closed when token configuration is absent",async()=>{
    vi.stubEnv("A1_BILLING_SERVICE_TOKEN","");
    await expect(startMobiTrial("mobi:top")).rejects.toThrow("A1_BILLING_NOT_CONFIGURED");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
