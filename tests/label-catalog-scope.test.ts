import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({context:vi.fn(),products:vi.fn(),variants:vi.fn(),locations:vi.fn(),devices:vi.fn()}));
vi.mock("@/server/db",()=>({db:{product:{findMany:mocks.products},deviceVariant:{findMany:mocks.variants},stockLocation:{findMany:mocks.locations},serializedDevice:{findMany:mocks.devices}}}));
vi.mock("@/server/auth-http",()=>({currentStoreContext:mocks.context,authJson:(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}}),sameOriginMutation:vi.fn()}));
import { GET } from "@/app/api/ops/live-01/route";
describe("label source is the authorized live catalog",()=>{
  beforeEach(()=>{vi.resetAllMocks();vi.stubEnv("A1_MOBI_C_LIVE_01_ENABLED","1");mocks.context.mockResolvedValue({tenantId:"tenant-a",branchId:"branch-a",permissions:new Set(["inventory.read"])});mocks.products.mockResolvedValue([{id:"p1",sku:"ABC123",nameAr:"غطاء",nameEn:"Case",isSerialized:false,barcodes:[{value:"5901234123457"}],basePrice:10}]);for(const fn of [mocks.variants,mocks.locations,mocks.devices])fn.mockResolvedValue([]);});
  afterEach(()=>vi.unstubAllEnvs());
  it("reads only active tenant products and returns identifiers and translated names",async()=>{
    const response=await GET();expect(response.status).toBe(200);expect(mocks.context).toHaveBeenCalledWith("inventory.read");
    expect(mocks.products).toHaveBeenCalledWith(expect.objectContaining({where:{tenantId:"tenant-a",isActive:true},take:100}));
    expect((await response.json()).products).toEqual([{id:"p1",sku:"ABC123",nameAr:"غطاء",nameEn:"Case",isSerialized:false,barcodes:["5901234123457"],price:10}]);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it.each(["AUTH_REQUIRED","PERMISSION_DENIED"])("rejects %s before catalog reads",async code=>{mocks.context.mockRejectedValue(new Error(code));expect((await GET()).status).toBe(code==="AUTH_REQUIRED"?401:403);expect(mocks.products).not.toHaveBeenCalled();});
  it("does not expose the source when pilot disabled",async()=>{vi.stubEnv("A1_MOBI_C_LIVE_01_ENABLED","0");expect((await GET()).status).toBe(404);expect(mocks.products).not.toHaveBeenCalled();});
});
