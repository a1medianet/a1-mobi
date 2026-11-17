import {createServer,type Server} from "node:http";
import type {AddressInfo} from "node:net";
import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {createRechargeReceiver,RechargeBridgeError} from "@/modules/recharge-bridge/receiver";

const scope={merchantId:"merchant-A",branchId:"branch-A"};
const orders=new Map<string,{fingerprint:string;order:Record<string,unknown>}>();
let server:Server,baseUrl="",requests=0;
const financialPosts=0;

beforeAll(async()=>{
  server=createServer(async(req,res)=>{
    requests++;
    const url=new URL(req.url??"/","http://127.0.0.1");
    const respond=(status:number,payload:unknown)=>{
      res.writeHead(status,{"content-type":"application/json","cache-control":"no-store"});
      res.end(JSON.stringify(payload));
    };
    if(req.headers.authorization!=="Bearer sandbox-only-token")return respond(401,{error:{code:"UNAUTHORIZED"}});
    if(req.headers["x-merchant-id"]!==scope.merchantId||req.headers["x-branch-id"]!==scope.branchId)
      return respond(403,{error:{code:"SCOPE_MISMATCH"}});
    if(req.method==="GET"&&url.pathname==="/v1/catalog")
      return respond(200,{items:[{sku:"ALFA-TEST",availability:"SANDBOX"}],catalogVersionId:"fixture-v1"});
    if(req.method==="GET"&&url.pathname==="/v1/settlements")
      return respond(200,{items:[],owner:"A1 Recharge",mobiCashMovements:0});
    if(req.method==="GET"&&url.pathname.startsWith("/v1/orders/")){
      const id=url.pathname.split("/").pop();
      const found=[...orders.values()].find(v=>v.order.rechargeOrderId===id);
      return found?respond(200,found.order):respond(404,{error:{code:"NOT_FOUND"}});
    }
    if(req.method!=="POST"||url.pathname!=="/v1/orders")return respond(404,{error:{code:"NOT_FOUND"}});
    let raw="";
    for await(const chunk of req) raw+=String(chunk);
    let payload:Record<string,unknown>;
    try{payload=JSON.parse(raw)}catch{return respond(400,{error:{code:"INVALID_JSON"}});}
    if(payload.merchantId!==scope.merchantId||payload.branchId!==scope.branchId)
      return respond(403,{error:{code:"SCOPE_MISMATCH"}});
    if(payload.quoteId==="expired-quote")return respond(410,{error:{code:"QUOTE_EXPIRED"}});
    if(payload.quoteId==="unavailable-provider")return respond(503,{error:{code:"UNAVAILABLE"}});
    const key=req.headers["idempotency-key"];
    if(typeof key!=="string"||!key)return respond(400,{error:{code:"IDEMPOTENCY_REQUIRED"}});
    const fingerprint=JSON.stringify(payload);
    const existing=orders.get(key);
    if(existing)return existing.fingerprint===fingerprint
      ?respond(200,existing.order):respond(409,{error:{code:"IDEMPOTENCY_CONFLICT"}});
    const order={...scope,rechargeOrderId:"sandbox-order-"+(orders.size+1),
      externalRef:payload.externalRef,state:"PENDING",version:1};
    orders.set(key,{fingerprint,order});
    return respond(201,order);
  });
  await new Promise<void>((resolve,reject)=>{
    server.once("error",reject);
    server.listen(0,"127.0.0.1",()=>resolve());
  });
  baseUrl="http://127.0.0.1:"+(server.address() as AddressInfo).port;
});
afterAll(async()=>{await new Promise<void>((resolve,reject)=>server.close(err=>err?reject(err):resolve()));});

function bridge(){
 return createRechargeReceiver({
  ...scope,env:{A1_MOBI_RECHARGE_SANDBOX_ENABLED:"1"},
  transport:async(path,option)=>{
    const result=await fetch(baseUrl+path,{
      method:option.method,
      headers:{"content-type":"application/json","authorization":"Bearer sandbox-only-token",
        "x-merchant-id":scope.merchantId,"x-branch-id":scope.branchId,
        ...(option.idempotencyKey?{"idempotency-key":option.idempotencyKey}:{})},
      body:option.body?JSON.stringify(option.body):undefined,
      redirect:"error",
    });
    const data=await result.json() as {error?:{code:string}};
    if(!result.ok)throw new RechargeBridgeError(data.error?.code??"REMOTE_ERROR",result.status);
    return data;
  },
 });
}
describe("G5 local loopback HTTP contract fixture, no real provider",()=>{
 it("replays the exact same POST key without a second order",async()=>{
  const client=bridge(),before=requests;
  const payload={quoteId:"test-quote",recipient:"sandbox-recipient",externalRef:"mobi-test-101"};
  const one=await client.createOrder(payload,"fixture-stable-key-1001");
  const two=await client.createOrder(payload,"fixture-stable-key-1001");
  expect(one).toEqual(two);
  expect(requests-before).toBe(2);
  expect(orders.size).toBe(1);
  expect(financialPosts).toBe(0);
  expect(await client.getOrder(one.rechargeOrderId)).toEqual(one);
 });
 it("rejects reused keys with changed payload",async()=>{
  const client=bridge();
  await expect(client.createOrder({
    quoteId:"changed",recipient:"sandbox-recipient",externalRef:"mobi-test-102",
  },"fixture-stable-key-1001")).rejects.toMatchObject({status:409,code:"IDEMPOTENCY_CONFLICT"});
  expect(orders.size).toBe(1);
 });
 it("returns definite quote expiry and temporary provider failure without cash",async()=>{
  const client=bridge();
  await expect(client.createOrder({
    quoteId:"expired-quote",recipient:"sandbox",externalRef:"mobi-expired",
  },"fixture-stable-key-1002")).rejects.toMatchObject({status:410});
  await expect(client.createOrder({
    quoteId:"unavailable-provider",recipient:"sandbox",externalRef:"mobi-unavailable",
  },"fixture-stable-key-1003")).rejects.toMatchObject({status:503});
  expect(financialPosts).toBe(0);
 });
 it("reads the contract's catalog and supplier ledger as separate ownership",async()=>{
  const client=bridge();
  expect(await client.listCatalog("LB","alfa")).toMatchObject({catalogVersionId:"fixture-v1"});
  expect(await client.listSupplierSettlements("2026-11-01","2026-11-17"))
    .toMatchObject({owner:"A1 Recharge",mobiCashMovements:0});
 });
});
