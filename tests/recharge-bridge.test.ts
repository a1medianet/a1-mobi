import {describe,it,expect,vi} from "vitest";
import {checkedOrder,createRechargeReceiver,observeRechargeOrder,rechargeSandboxEnabled,RechargeBridgeError,type RechargeOrder} from "@/modules/recharge-bridge/receiver";
const scope={merchantId:"merchant-A",branchId:"branch-A"};
const order:RechargeOrder={...scope,rechargeOrderId:"r1",externalRef:"mobi1",state:"PENDING",version:1};
const env={A1_MOBI_RECHARGE_SANDBOX_ENABLED:"1"};
describe("G5 Mobi receiver sandbox safety",()=>{
 it("is off by default and refuses any real-money override",()=>{
  expect(rechargeSandboxEnabled({})).toBe(false);
  expect(rechargeSandboxEnabled({...env,A1_MOBI_RECHARGE_REAL_MONEY_ENABLED:"1"})).toBe(false);
  expect(()=>createRechargeReceiver({...scope,transport:vi.fn(),env:{}})).toThrow("SANDBOX_DISABLED");
 });
 it("scopes every order and prevents cross-merchant reads",()=>{
  expect(checkedOrder(order,scope)).toEqual(order);
  expect(()=>checkedOrder({...order,merchantId:"other"},scope)).toThrow("SCOPE_MISMATCH");
  expect(()=>checkedOrder({...order,branchId:"other"},scope)).toThrow("SCOPE_MISMATCH");
 });
 it("uses an unchanged key and scoped body for write calls",async()=>{
  const transport=vi.fn(async(path:string,request:unknown)=>{void path;void request;return order;});
  const bridge=createRechargeReceiver({...scope,transport,env});
  const payload={quoteId:"q1",recipient:"test-recipient",externalRef:"mobi1"};
  await bridge.createOrder(payload,"same-key-123456");
  await bridge.createOrder(payload,"same-key-123456");
  expect(transport).toHaveBeenCalledTimes(2);
  expect(transport.mock.calls[0][1]).toMatchObject({
   method:"POST",idempotencyKey:"same-key-123456",
   body:{...scope,...payload},
  });
 });
 it("rejects missing write idempotency and malformed identifiers",async()=>{
  const bridge=createRechargeReceiver({...scope,transport:vi.fn(async()=>order),env});
  await expect(bridge.createOrder({quoteId:"q",recipient:"x",externalRef:"e"},"")).rejects.toThrow("INVALID_IDEMPOTENCY_KEY");
  await expect(bridge.getOrder("../merchant-B")).rejects.toThrow("INVALID_IDENTIFIER");
 });
 it("never retries unknown transport outcome",async()=>{
  const transport=vi.fn(async()=>{throw new Error("connection lost");});
  const bridge=createRechargeReceiver({...scope,transport,env});
  await expect(bridge.createOrder({quoteId:"q",recipient:"x",externalRef:"e"},"stable-key-123456")).rejects.toThrow("connection lost");
  expect(transport).toHaveBeenCalledTimes(1);
 });
 it("handles duplicate and out-of-order update without money posting",()=>{
  expect(observeRechargeOrder(order,{...order,version:1})).toMatchObject({accepted:false,financialPostingAllowed:false});
  expect(observeRechargeOrder(order,{...order,state:"PROCESSING",version:2,requiresReconciliation:true})).toMatchObject({
   accepted:true,reconcile:true,financialPostingAllowed:false,
  });
 });
 it("refuses rollback from processing and terminal rewrites",()=>{
  const processing={...order,state:"PROCESSING" as const,version:2};
  expect(()=>observeRechargeOrder(processing,{...order,version:3})).toThrow("INVALID_STATE_TRANSITION");
  expect(()=>observeRechargeOrder({...order,state:"COMPLETED",version:4},{...order,state:"FAILED",version:5})).toThrow("TERMINAL_STATE_IMMUTABLE");
  expect(()=>observeRechargeOrder(order,{...order,merchantId:"other",version:2})).toThrow("ORDER_IDENTITY_MISMATCH");
 });
 it("does not allow malformed or unscoped remote payloads",()=>{
  expect(()=>checkedOrder({...order,version:0},scope)).toThrow(RechargeBridgeError);
  expect(()=>checkedOrder({...order,state:"DELIVERED"},scope)).toThrow("INVALID_ORDER");
 });
});

describe("G5 catalog and supplier settlements are read-only",()=>{
 it("reads an explicitly scoped catalog and supplier settlement without creating Mobi cash movements",async()=>{
   const transport=vi.fn(async(path:string,request:{method:string})=>{void path;void request;return {items:[]};});
   const bridge=createRechargeReceiver({...scope,transport,env});
   expect(await bridge.listCatalog("LB","alfa")).toEqual({items:[]});
   expect(await bridge.listSupplierSettlements("2026-11-01","2026-11-17")).toEqual({items:[]});
   expect(transport.mock.calls).toHaveLength(2);
   expect(transport.mock.calls.map(call=>call[0])).toEqual([
    "/v1/catalog?country=LB&operator=alfa&branchId=branch-A",
    "/v1/settlements?from=2026-11-01&to=2026-11-17&branchId=branch-A",
   ]);
   expect(transport.mock.calls.every(call=>call[1]?.method==="GET")).toBe(true);
 });
 it("blocks malformed catalog and settlement filters before transport",async()=>{
   const transport=vi.fn(async(path:string,request:{method:string})=>{void path;void request;return {items:[]};});
   const bridge=createRechargeReceiver({...scope,transport,env});
   await expect(bridge.listCatalog("US&admin=true","alfa")).rejects.toThrow("INVALID_CATALOG_FILTER");
   await expect(bridge.listSupplierSettlements("2026-11-20","2026-11-01")).rejects.toThrow("INVALID_DATE_RANGE");
   expect(transport).not.toHaveBeenCalled();
 });
});
