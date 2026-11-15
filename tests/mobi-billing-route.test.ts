import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  tenant: "mobi:top-mobile-id",
  denied: false,
  trials: new Map<string, {tenantId:string;productKey:string;status:string;planCode:string;expiresAt:string;features:Record<string,string>}>(),
  checkoutCalls: [] as Array<{tenantId:string;planCode:string;email:string;returnUrl:string}>,
}));
vi.mock("@/server/mobi-billing-owner", () => ({
  requireBillingOwner: async () => {
    if (mock.denied) throw new Error("PERMISSION_DENIED");
    return { tenantId: mock.tenant.slice(5), billingTenantKey: mock.tenant, email:"owner@example.test" };
  },
}));
vi.mock("@/server/auth-http", () => ({
  sameOriginMutation: (request:Request) => request.headers.get("origin") === "http://localhost:3000",
  authJson: (body:unknown,status=200) => Response.json(body,{status,headers:{"Cache-Control":"no-store"}}),
}));
vi.mock("@/server/billing-client", () => ({
  getMobiEntitlements: async (key:string) => mock.trials.get(key) ||
    { tenantId:key,productKey:"mobi",status:"none",features:{} },
  startMobiTrial: async (key:string) => {
    if(mock.trials.has(key)) throw new Error("SUBSCRIPTION_EXISTS");
    const entitlement = {tenantId:key,productKey:"mobi",status:"trialing",planCode:"mobi-pilot",
      expiresAt:new Date(Date.now()+14*86_400_000).toISOString(),features:{"mobi.access":"true"}};
    mock.trials.set(key,entitlement);
    return entitlement;
  },
  createMobiCheckout: async (input:{tenantId:string;planCode:string;email:string;returnUrl:string}) => {
    mock.checkoutCalls.push(input);
    return {checkoutId:"checkout-1",checkoutUrl:"https://billing.test/checkout/mobi?r=checkout-1"};
  },
}));
import { GET, POST } from "@/app/api/billing/mobi/route";

const req=(data:unknown,origin="http://localhost:3000")=>new Request(
  "http://localhost:3000/api/billing/mobi?locale=ar",{
    method:"POST",headers:{"content-type":"application/json",origin},body:JSON.stringify(data),
  });

describe("A1 Mobi central subscription gate",()=>{
  beforeEach(()=>{
    mock.tenant="mobi:top-mobile-id";mock.denied=false;mock.trials.clear();mock.checkoutCalls.length=0;
    vi.stubEnv("APP_ORIGIN","http://localhost:3000");
  });
  afterEach(()=>vi.unstubAllEnvs());

  it("starts a card-free 14-day trial once and rejects repeats",async()=>{
    const first=await POST(req({action:"START_TRIAL"}));
    expect(first.status).toBe(201);
    const body=await first.json();
    expect(body.entitlement.tenantId).toBe("mobi:top-mobile-id");
    expect(body.entitlement.planCode).toBe("mobi-pilot");
    expect(Date.parse(body.entitlement.expiresAt)-Date.now()).toBeGreaterThan(13*86_400_000);
    expect((await POST(req({action:"START_TRIAL"}))).status).toBe(409);
  });

  it("isolates Top Mobile and a second store, and never accepts a browser-supplied tenant",async()=>{
    await POST(req({action:"START_TRIAL"}));
    mock.tenant="mobi:another-store-id";
    expect((await GET()).status).toBe(200);
    expect((await (await GET()).json()).entitlement.status).toBe("none");
    expect((await POST(req({action:"START_TRIAL",tenantId:"mobi:top-mobile-id"}))).status).toBe(400);
    expect((await POST(req({action:"START_TRIAL"}))).status).toBe(201);
    expect(mock.trials.size).toBe(2);
    expect(mock.trials.get("mobi:top-mobile-id")?.status).toBe("trialing");
  });

  it("reflects expired access and does not grant new entitlements",async()=>{
    await POST(req({action:"START_TRIAL"}));
    const old=mock.trials.get("mobi:top-mobile-id")!;
    old.expiresAt=new Date(Date.now()-86_400_000).toISOString();
    old.features={};
    const result=await (await GET()).json();
    expect(result.entitlement.expiresAt).toBe(old.expiresAt);
    expect(result.entitlement.features["mobi.access"]).toBeUndefined();
    expect((await POST(req({action:"START_TRIAL"}))).status).toBe(409);
  });

  it("constructs checkout for A1 Mobi only and returns to the local store",async()=>{
    const result=await POST(req({action:"CHECKOUT",planCode:"mobi-monthly"}));
    expect(result.status).toBe(201);
    expect((await result.json()).checkoutUrl).toContain("/checkout/mobi?");
    expect(mock.checkoutCalls).toEqual([{
      tenantId:"mobi:top-mobile-id",planCode:"mobi-monthly",
      email:"owner@example.test",returnUrl:"http://localhost:3000/ar/account?billing=return",
    }]);
    mock.tenant="mobi:another-store-id";
    expect((await POST(req({action:"CHECKOUT",planCode:"mobi-annual"}))).status).toBe(201);
    expect(mock.checkoutCalls[1].tenantId).toBe("mobi:another-store-id");
  });

  it("rejects staff, cross-origin requests, arbitrary plans, and forged identities",async()=>{
    mock.denied=true;
    expect((await POST(req({action:"START_TRIAL"}))).status).toBe(403);
    mock.denied=false;
    expect((await POST(req({action:"START_TRIAL"},"https://evil.test"))).status).toBe(403);
    expect((await POST(req({action:"CHECKOUT",planCode:"mobi-pilot"}))).status).toBe(400);
    expect((await POST(req({action:"CHECKOUT",planCode:"mobi-annual",tenantId:"other"}))).status).toBe(400);
  });

  it("blocks checkout without an approved return origin",async()=>{
    vi.stubEnv("APP_ORIGIN","");
    expect((await POST(req({action:"CHECKOUT",planCode:"mobi-monthly"}))).status).toBe(503);
    expect(mock.checkoutCalls).toHaveLength(0);
  });
});
