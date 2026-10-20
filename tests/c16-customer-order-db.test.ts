import {randomUUID} from "node:crypto";
import {beforeAll,afterAll,describe,expect,it,vi} from "vitest";
import {db} from "@/server/db";
import {bootstrapStore} from "@/server/bootstrap-service";
type Context={actorId:string;tenantId:string;branchId:string;permissions:Set<string>};
let active:Context|null=null;
vi.mock("@/server/auth-http",async getOriginal=>{
 const original=await getOriginal<typeof import("@/server/auth-http")>();
 return {...original,currentStoreContext:async(permission?:string)=>{
  if(!active)throw new Error("AUTH_REQUIRED");
  if(permission&&!active.permissions.has(permission))throw new Error("PERMISSION_DENIED");
  return active;
 }};
});
const runDb=process.env.DATABASE_URL?describe:describe.skip;
runDb("C16 customer web order to store owner (UAT only)",()=>{
 let owner:typeof import("@/app/api/ops/store-orders/route");
 let customer:typeof import("@/app/api/shop/[slug]/orders/route");
 let live:typeof import("@/app/api/ops/live-01/route");
 let ctx1:Context;let ctx2:Context;
 let productId="";let slug="";
 const prev=process.env.A1_MOBI_PUBLIC_ORDERS_ENABLED;
 const prevLive=process.env.A1_MOBI_C_LIVE_01_ENABLED;
 const origin=process.env.APP_ORIGIN??"http://127.0.0.1:3224";
 async function post(path:string,body:unknown){
  return new Request(origin+path,{method:"POST",headers:{"content-type":"application/json",origin},body:JSON.stringify(body)});
 }
 async function place(body:unknown,sl=slug){
  return customer.POST(await post("/api/shop/"+sl+"/orders",body),{params:Promise.resolve({slug:sl})});
 }
 async function manage(body:unknown){return owner.POST(await post("/api/ops/store-orders",body));}
 beforeAll(async()=>{
  process.env.A1_MOBI_PUBLIC_ORDERS_ENABLED="1";
  process.env.A1_MOBI_C_LIVE_01_ENABLED="1";
  const suffix=randomUUID().slice(0,8);
  const a=await bootstrapStore({tenantSlug:"c16-one-"+suffix,tenantName:"C16 Order Store",branchCode:"MAIN",branchName:"C16 Phones",ownerEmail:"owner-one-"+suffix+"@example.test",ownerDisplayName:"Owner One",ownerPassword:"Pilot-UAT-password-"+suffix,locale:"ar"});
  const b=await bootstrapStore({tenantSlug:"c16-two-"+suffix,tenantName:"C16 Foreign",branchCode:"MAIN",branchName:"Foreign",ownerEmail:"owner-two-"+suffix+"@example.test",ownerDisplayName:"Owner Two",ownerPassword:"Pilot-UAT-password-"+suffix,locale:"ar"});
  const permissions=new Set(["foundation.manage","inventory.read","sell.create","reports.read"]);
  ctx1={actorId:a.ownerId,tenantId:a.tenantId,branchId:a.branchId,permissions};
  ctx2={actorId:b.ownerId,tenantId:b.tenantId,branchId:b.branchId,permissions};
  live=await import("@/app/api/ops/live-01/route");
  owner=await import("@/app/api/ops/store-orders/route");
  customer=await import("@/app/api/shop/[slug]/orders/route");
  active=ctx1;
  const created=await live.POST(await post("/api/ops/live-01",{
   action:"createProduct",sku:"WEB-"+suffix,brand:"PILOT",model:"Device",variant:"128GB",nameAr:"هاتف للطلب",nameEn:"Web Order Phone",unitCost:120,price:399.25
  }));
  expect(created.status).toBe(201);
  const p=await created.json();productId=p.id;
  const received=await live.POST(await post("/api/ops/live-01",{
   action:"receive",productId:p.id,variantId:p.variantId,locationId:p.locationId,
   imei:"352099001761481",unitCost:120,idempotencyKey:randomUUID()
  }));
  expect(received.status).toBe(201);
  const enabled=await manage({action:"activate"});
  expect(enabled.status).toBe(200);
  slug=(await enabled.json()).slug;
 },90000);
 afterAll(()=>{
  active=null;
  if(prev===undefined)delete process.env.A1_MOBI_PUBLIC_ORDERS_ENABLED;
  else process.env.A1_MOBI_PUBLIC_ORDERS_ENABLED=prev;
  if(prevLive===undefined)delete process.env.A1_MOBI_C_LIVE_01_ENABLED;
  else process.env.A1_MOBI_C_LIVE_01_ENABLED=prevLive;
 });
 it("accepts exactly one real pending request, authoritative price, and no sale",async()=>{
  active=ctx1;
  const key=randomUUID();
  const input={name:"Pilot Customer",phone:"+96170123456",items:[{productId,quantity:1}],idempotencyKey:key};
  const first=await place(input);expect(first.status).toBe(201);
  const ref=(await first.json()).reference;
  expect(ref).toMatch(/^WEB-/);
  const repeat=await place(input);expect(repeat.status).toBe(200);
  expect((await repeat.json()).reference).toBe(ref);
  const row=await owner.GET();expect(row.status).toBe(200);
  const state=await row.json();
  const order=state.orders.find((x:{number:string})=>x.number===ref);
  expect(order).toBeTruthy();expect(order.totalAmount).toBe(399.25);
  expect(order.items[0].quantity).toBe(1);
  expect(order.status).toBe("NEW");
  const sales=await db.sale.count({where:{tenantId:ctx1.tenantId}});
  expect(sales).toBe(0);
  active=ctx2;
  const other=await (await owner.GET()).json();
  expect(other.orders.some((x:{number:string})=>x.number===ref)).toBe(false);
  const forbidden=await manage({action:"setStatus",id:order.id,status:"CONFIRMED"});
  expect(forbidden.status).toBe(404);
  active=ctx1;
  const confirmed=await manage({action:"setStatus",id:order.id,status:"CONFIRMED"});
  expect(confirmed.status).toBe(200);
  expect((await manage({action:"setStatus",id:order.id,status:"CONFIRMED"})).status).toBe(409);
  expect((await manage({action:"setStatus",id:order.id,status:"CLOSED"})).status).toBe(200);
 });
 it("blocks unknown product, fake quantity and disabled owner store",async()=>{
  active=ctx1;
  const req=(product:string,quantity:number)=>({name:"Pilot Customer",phone:"+96170123457",
   items:[{productId:product,quantity}],idempotencyKey:randomUUID()});
  expect((await place(req(randomUUID(),1))).status).toBe(409);
  expect((await place(req(productId,99))).status).toBe(400);
  const disabled=await manage({action:"disable"});expect(disabled.status).toBe(200);
  expect((await place(req(productId,1))).status).toBe(404);
  expect((await manage({action:"activate"})).status).toBe(200);
 });
 it("rejects invalid origin, public store guesses and owner privilege misuse",async()=>{
  active=ctx1;
  const body={name:"Customer",phone:"+96170123458",items:[{productId,quantity:1}],idempotencyKey:randomUUID()};
  const wrong=new Request(origin+"/api/shop/"+slug+"/orders",{method:"POST",
   headers:{"content-type":"application/json",origin:"https://attacker.example"},body:JSON.stringify(body)});
  expect((await customer.POST(wrong,{params:Promise.resolve({slug})})).status).toBe(403);
  expect((await place(body,"a".repeat(32))).status).toBe(404);
  active={...ctx1,permissions:new Set(["inventory.read"])};
  expect((await manage({action:"disable"})).status).not.toBe(200);
  expect((await owner.GET()).status).not.toBe(200); // customer phone PII needs store-manager rights
  active=ctx1;
 });
});
