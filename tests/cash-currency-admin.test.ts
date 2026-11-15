import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
const m=vi.hoisted(()=>({
  ctx:vi.fn(),tenant:vi.fn(),branch:vi.fn(),policy:vi.fn(),
  upsert:vi.fn(),rate:vi.fn(),audit:vi.fn(),transaction:vi.fn(),
  origin:vi.fn(),
}));
vi.mock("@/server/auth-http",()=>({
  currentStoreContext:m.ctx,
  sameOriginMutation:m.origin,
  authJson:(data:unknown,status=200)=>new Response(JSON.stringify(data),{status}),
}));
vi.mock("@/server/db",()=>({
  db:{
    tenant:{findUnique:m.tenant},branch:{findFirst:m.branch},
    featureFlag:{findUnique:m.policy,upsert:m.upsert},
    exchangeRate:{create:m.rate},auditEvent:{create:m.audit},
    $transaction:m.transaction,
  },
}));
import {POST} from "@/app/api/ops/currency/route";
function request(body:unknown){
  return new Request("https://mobi.a1medianet.com/api/ops/currency",{
    method:"POST",headers:{"content-type":"application/json",
      origin:"https://mobi.a1medianet.com"},
    body:JSON.stringify(body),
  });
}
const rate={action:"rate",base:"USD",quote:"LBP",rate:"89500",confirmed:true};
afterEach(()=>vi.unstubAllEnvs());
beforeEach(()=>{
  vi.clearAllMocks();
  vi.stubEnv("A1_MOBI_C_LIVE_01_ENABLED","1");
  m.ctx.mockResolvedValue({tenantId:"t-1",branchId:"b-1",actorId:"u-1"});
  m.origin.mockReturnValue(true);
  m.tenant.mockResolvedValue({baseCurrency:"USD",defaultLocale:"ar"});
  m.branch.mockResolvedValue({id:"b-1"});
  m.policy.mockResolvedValue(null);
  m.rate.mockResolvedValue({id:"rate-1",effectiveAt:new Date("2026-11-13T12:00:00Z")});
  m.audit.mockResolvedValue({});
  m.upsert.mockResolvedValue({});
  m.transaction.mockImplementation(async(fn:(tx:unknown)=>Promise<unknown>)=>fn({
    featureFlag:{upsert:m.upsert},exchangeRate:{create:m.rate},auditEvent:{create:m.audit},
  }));
});
describe("A1 Currency admin — tenant/branch financial settings protection",()=>{
  it("rejects all unauthenticated requests before touching currency settings",async()=>{
    m.ctx.mockRejectedValue(new Error("AUTH_REQUIRED"));
    expect((await POST(request(rate))).status).toBe(401);
    expect(m.rate).not.toHaveBeenCalled();
  });
  it("rejects cross-site POST and disabled operational gate",async()=>{
    m.origin.mockReturnValue(false);
    expect((await POST(request(rate))).status).toBe(403);
    expect(m.rate).not.toHaveBeenCalled();
    vi.stubEnv("A1_MOBI_C_LIVE_01_ENABLED","0");
    expect((await POST(request(rate))).status).toBe(404);
  });
  it("stores an authorized manual quote scoped to the selected branch with audit",async()=>{
    const result=await POST(request(rate));
    expect(result.status).toBe(201);
    expect(m.branch).toHaveBeenCalledWith({where:{id:"b-1",tenantId:"t-1"},select:{id:true}});
    expect(m.rate).toHaveBeenCalledWith({data:expect.objectContaining({
      tenantId:"t-1",branchId:"b-1",setById:"u-1",
      baseCurrency:"USD",quoteCurrency:"LBP",rate:expect.anything(),
    })});
    expect(m.audit).toHaveBeenCalledWith({data:expect.objectContaining({
      action:"currency.manual_rate.saved",tenantId:"t-1",branchId:"b-1",actorId:"u-1",
    })});
  });
  it("rejects pairs not explicitly enabled for the organization",async()=>{
    expect((await POST(request({...rate,quote:"EUR"}))).status).toBe(403);
    expect(m.rate).not.toHaveBeenCalled();
  });
  it("rejects invalid or zero rate and mismatched pair",async()=>{
    expect((await POST(request({...rate,rate:"0"}))).status).toBe(400);
    expect((await POST(request({...rate,quote:"USD"}))).status).toBe(400);
    expect(m.rate).not.toHaveBeenCalled();
  });
  it("saves allowed currencies, locale and country without changing accounting base",async()=>{
    const result=await POST(request({
      action:"policy",allowedCurrencies:["USD","LBP","EUR","SAR"],
      preferredCurrency:"EUR",countryCode:"LB",preferredLocale:"en",confirmed:true,
    }));
    expect(result.status).toBe(200);
    expect(m.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where:{tenantId_key:{tenantId:"t-1",key:"a1.currency.policy"}},
      create:expect.objectContaining({tenantId:"t-1"}),
    }));
    expect(m.audit).toHaveBeenCalledWith({data:expect.objectContaining({
      action:"currency.policy.changed",tenantId:"t-1",branchId:"b-1",
    })});
    expect(m.tenant).toHaveBeenCalledTimes(1);
    expect(m.rate).not.toHaveBeenCalled();
  });
});
