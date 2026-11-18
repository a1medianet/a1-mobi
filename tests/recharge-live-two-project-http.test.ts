import {afterAll,beforeAll,describe,expect,it,vi} from "vitest";
import {createRechargeReceiver} from "@/modules/recharge-bridge/receiver";
import {createRechargeSandboxTransport} from "@/modules/recharge-bridge/http";

describe("G5 Mobi sandbox HTTP security boundary",()=>{
 it("rejects insecure internet endpoints, credentials, query strings and traversal",()=>{
  for(const baseUrl of ["http://api.example.com/","https://user:pass@example.com/",
    "https://example.com/?token=x","https://example.com/api/"]){
    expect(()=>createRechargeSandboxTransport({baseUrl,merchantId:"a",branchId:"b",getToken:async()=>"test"})).toThrow("UNSAFE_RECHARGE_ENDPOINT");
  }
 });
 it("does not automatically retry interrupted financial POST",async()=>{
  const fn=vi.fn(async()=>{throw new Error("network disrupted");});
  const transport=createRechargeSandboxTransport({
    baseUrl:"http://127.0.0.1:9876/",merchantId:"merchant-A",branchId:"branch-A",
    getToken:async()=>"sandbox-token",requestFetch:fn as unknown as typeof fetch,
  });
  await expect(transport("/v1/orders",{method:"POST",idempotencyKey:"same-key",
    body:{quoteId:"q"}})).rejects.toThrow("RECHARGE_OUTCOME_UNKNOWN");
  expect(fn).toHaveBeenCalledTimes(1);
 });
 it("injects merchant and branch scopes and denies missing secret",async()=>{
  const fn=vi.fn(async(url:string|URL|Request,init?:RequestInit)=>{
    void url;void init;
    return new Response(JSON.stringify({items:[]}),{status:200});
  });
  const transport=createRechargeSandboxTransport({
    baseUrl:"http://127.0.0.1:9876/",merchantId:"merchant-A",branchId:"branch-A",
    getToken:async()=>"secret-only-server",requestFetch:fn as unknown as typeof fetch,
  });
  expect(await transport("/v1/catalog?country=LB&operator=alfa",{method:"GET"})).toEqual({items:[]});
  const init=fn.mock.calls[0][1] as RequestInit;
  expect(init.headers).toMatchObject({
    authorization:"Bearer secret-only-server","x-a1-merchant-id":"merchant-A",
    "x-a1-branch-id":"branch-A",accept:"application/vnd.a1-recharge.v1+json",
  });
  const unavailable=createRechargeSandboxTransport({
    baseUrl:"http://127.0.0.1:9876/",merchantId:"merchant-A",branchId:"branch-A",
    getToken:async()=>"",requestFetch:fn as unknown as typeof fetch,
  });
  await expect(unavailable("/v1/catalog",{method:"GET"})).rejects.toThrow("SERVICE_CREDENTIALS_UNAVAILABLE");
 });
});

// Real HTTP protocol between two independent project modules, but using test-only
// opaque credentials and an isolated SQLite file, not an OAuth2 production deployment.
// Explicit environment variable enables this cross-check on Thaghr.
const modulePath=process.env.A1_RECHARGE_G5_SANDBOX_MODULE;
describe.skipIf(!modulePath)("G5 Mobi-to-Recharge separate application HTTP sandbox",()=>{
 let close:()=>Promise<void>;
 let origin:string;
 let dir:string;
 beforeAll(async()=>{
   const fs=await import("node:fs");
   const os=await import("node:os");
   const path=await import("node:path");
   const url=await import("node:url");
   dir=fs.mkdtempSync(path.join(os.tmpdir(),"a1-mobi-real-g5-"));
   const apiModule=await import(/* @vite-ignore */ url.pathToFileURL(modulePath!).href);
   const api=apiModule.createG5SandboxServer({
     dbFile:path.join(dir,"integration.sqlite"),
     credentials:[
       {token:"sandbox-token-A",merchantId:"merchant-A",branchId:"branch-A"},
       {token:"sandbox-token-B",merchantId:"merchant-B",branchId:"branch-B"},
     ],
   });
   api.insertDemoProduct({sku:"ALFA-TEST-USD"});
   await new Promise<void>((resolve,reject)=>{
     api.server.once("error",reject);
     api.server.listen(0,"127.0.0.1",()=>resolve());
   });
   origin="http://127.0.0.1:"+api.server.address().port+"/";
   close=async()=>{await api.close();fs.rmSync(dir,{recursive:true,force:true});};
 });
 afterAll(async()=>{if(close)await close();});
 const receiver=(merchantId:string,branchId:string,token:string)=>{
   const transport=createRechargeSandboxTransport({baseUrl:origin,merchantId,branchId,
     getToken:async()=>token});
   return createRechargeReceiver({merchantId,branchId,transport,
     env:{A1_MOBI_RECHARGE_SANDBOX_ENABLED:"1"}});
 };
 it("reads Recharge catalog and creates idempotent pending orders through real HTTP",async()=>{
   const a=receiver("merchant-A","branch-A","sandbox-token-A");
   const catalog=await a.listCatalog("LB","alfa") as {items:Array<{sku:string}>};
   expect(catalog.items[0].sku).toBe("ALFA-TEST-USD");
   const q=await a.createQuote({country:"LB",operator:"alfa",sku:"ALFA-TEST-USD",quantity:1},
     "test-quote-key-12345") as {quoteId:string};
   const payload={quoteId:q.quoteId,recipient:"96170000000",externalRef:"mobi-sandbox-ref-A"};
   const first=await a.createOrder(payload,"test-order-key-A-123456");
   const second=await a.createOrder(payload,"test-order-key-A-123456");
   expect(first.rechargeOrderId).toBe(second.rechargeOrderId);
   expect(first.state).toBe("PENDING");
   expect((await a.getOrder(first.rechargeOrderId)).rechargeOrderId).toBe(first.rechargeOrderId);
   const b=receiver("merchant-B","branch-B","sandbox-token-B");
   await expect(b.getOrder(first.rechargeOrderId)).rejects.toMatchObject({status:404});
   expect(await a.listSupplierSettlements("2026-11-01","2026-11-17")).toMatchObject({sandbox:true,items:[]});
 });
});
