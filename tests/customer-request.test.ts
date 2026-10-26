import { beforeEach,describe,it,expect,vi } from "vitest";
const m=vi.hoisted(()=>({catalog:vi.fn(),query:vi.fn(),write:vi.fn()}));
vi.mock("@/server/db",()=>({db:{$queryRawUnsafe:m.query,$executeRawUnsafe:m.write}}));
vi.mock("@/server/public-store",()=>({publicStoreCatalog:m.catalog}));
vi.mock("@/server/auth-http",()=>({sameOriginMutation:(r:Request)=>r.headers.get("origin")==="http://localhost",authJson:(b:unknown,s=200)=>Response.json(b,{status:s})}));
import {POST} from "@/app/api/shop/[slug]/orders/route";
const key="123e4567-e89b-42d3-a456-426614174000";
const input={name:"Customer",phone:"+96170123456",items:[{productId:"product-a",quantity:2}],idempotencyKey:key};
const post=(body:object,origin="http://localhost")=>POST(new Request("http://localhost/api/shop/store/orders",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(body)}),{params:Promise.resolve({slug:"a".repeat(32)})});
describe("customer request basket",()=>{
 beforeEach(()=>{vi.resetAllMocks();m.catalog.mockResolvedValue({id:"branch-a",tenantId:"tenant-a",products:[{id:"product-a",sku:"SKU",nameAr:"هاتف",nameEn:"Phone",price:25,available:3}]});m.query.mockResolvedValueOnce([]).mockResolvedValue([{count:BigInt(0)}]);m.write.mockResolvedValue(1);});
 it("snapshots server prices and tenant scope",async()=>{const res=await post(input);expect(res.status).toBe(201);expect((await res.json()).accepted).toBe(true);const args=m.write.mock.calls[0];expect(args.slice(2,4)).toEqual(["tenant-a","branch-a"]);expect(JSON.parse(args[10])).toMatchObject([{quantity:2,unitPrice:25,lineTotal:50}]);expect(args[11]).toBe(50);});
 it("rejects injected prices and tenant identifiers",async()=>{expect((await post({...input,tenantId:"other",total:1})).status).toBe(400);expect(m.write).not.toHaveBeenCalled();});
 it("rejects unavailable quantities",async()=>{expect((await post({...input,items:[{productId:"product-a",quantity:4}]})).status).toBe(409);expect(m.write).not.toHaveBeenCalled();});
 it("rejects foreign tenant products",async()=>{expect((await post({...input,items:[{productId:"foreign-product",quantity:1}]})).status).toBe(409);expect(m.write).not.toHaveBeenCalled();});
 it("rejects duplicate basket lines",async()=>{expect((await post({...input,items:[...input.items,...input.items]})).status).toBe(400);});
 it("returns the same reference on retry without another insert",async()=>{m.query.mockReset();m.query.mockResolvedValue([{number:"WEB-EXISTING",status:"NEW",branchId:"branch-a"}]);const res=await post(input);expect(res.status).toBe(200);expect((await res.json()).reference).toBe("WEB-EXISTING");expect(m.write).not.toHaveBeenCalled();});
 it("rejects cross-origin requests",async()=>{expect((await post(input,"https://foreign.test")).status).toBe(403);expect(m.catalog).not.toHaveBeenCalled();});
});
