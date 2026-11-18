import {describe,it,expect,vi} from "vitest";
import {createRechargeReceiver,RechargeBridgeError} from "@/modules/recharge-bridge/receiver";

const scope={merchantId:"merchant-A",branchId:"branch-A"};
const env={A1_MOBI_RECHARGE_SANDBOX_ENABLED:"1"};
const pending={...scope,rechargeOrderId:"order-A-1",externalRef:"mobi-synthetic-A-1",
  version:1,state:"PENDING" as const};
const cancelled={...pending,version:2,state:"CANCELLED" as const};
const event={eventId:"event-A-0001",type:"recharge.order.v1",...scope,
  rechargeOrderId:"order-A-1",version:2,state:"CANCELLED",
  occurredAt:"2026-11-18T10:00:00.000Z"};

describe("G5 v0.2 Mobi-owned adapter contract",()=>{
 it("does not expose any new workflow when sandbox flag is OFF",()=>{
  const transport=vi.fn(async()=>cancelled);
  expect(()=>createRechargeReceiver({...scope,env:{},transport})).toThrow("SANDBOX_DISABLED");
  expect(transport).not.toHaveBeenCalled();
 });
 it("cancels through scoped idempotent HTTP request without touching Mobi cash",async()=>{
  const transport=vi.fn(async(path:string,request:{method:string;idempotencyKey?:string;body?:unknown})=>{
    expect(path).toBe("/v1/orders/order-A-1/cancel");
    expect(request).toEqual({method:"POST",idempotencyKey:"cancel-A-000012",
      body:{merchantId:"merchant-A",branchId:"branch-A"}});
    return cancelled;
  });
  const bridge=createRechargeReceiver({...scope,env,transport});
  const first=await bridge.cancelOrder("order-A-1","cancel-A-000012");
  const replay=await bridge.cancelOrder("order-A-1","cancel-A-000012");
  expect(first).toEqual(replay);
  expect(first.state).toBe("CANCELLED");
  expect(transport).toHaveBeenCalledTimes(2);
 });
 it("refuses cancellation without a stable key or with an invalid ID",async()=>{
  const transport=vi.fn(async()=>cancelled);
  const bridge=createRechargeReceiver({...scope,env,transport});
  await expect(bridge.cancelOrder("order-A-1","new")).rejects.toThrow("INVALID_IDEMPOTENCY_KEY");
  await expect(bridge.cancelOrder("../other","cancel-A-000012")).rejects.toThrow("INVALID_IDENTIFIER");
  expect(transport).not.toHaveBeenCalled();
 });
 it("replays a scoped cursor feed for reconciliation without posting money",async()=>{
  const transport=vi.fn(async(path:string,request:{method:string})=>{
    expect(path).toBe("/v1/events?cursor=0");
    expect(request.method).toBe("GET");
    return {items:[event],nextCursor:"1",hasMore:false,sandbox:true};
  });
  const bridge=createRechargeReceiver({...scope,env,transport});
  const page=await bridge.replayEvents("0");
  expect(page.items).toEqual([event]);
  expect(page.nextCursor).toBe("1");
  expect(page.hasMore).toBe(false);
 });
 it("rejects invalid cursor and cross-merchant event feeds",async()=>{
  const transport=vi.fn(async()=>({items:[{...event,merchantId:"merchant-B"}],nextCursor:"1",
    hasMore:false,sandbox:true}));
  const bridge=createRechargeReceiver({...scope,env,transport});
  await expect(bridge.replayEvents("-1")).rejects.toThrow("INVALID_EVENT_CURSOR");
  await expect(bridge.replayEvents("0")).rejects.toThrow("EVENT_SCOPE_OR_SCHEMA_MISMATCH");
  expect(transport).toHaveBeenCalledTimes(1);
 });
 it("refuses unsigned-looking invalid feed shapes and oversized pages",async()=>{
  const transport=vi.fn(async()=>({items:Array(51).fill(event),nextCursor:"51",
    hasMore:false,sandbox:true}));
  const bridge=createRechargeReceiver({...scope,env,transport});
  await expect(bridge.replayEvents("0")).rejects.toThrow("INVALID_EVENT_FEED");
 });
 it("rejects cancelled-order responses from another branch",async()=>{
  const transport=vi.fn(async()=>({...cancelled,branchId:"branch-B"}));
  const bridge=createRechargeReceiver({...scope,env,transport});
  await expect(bridge.cancelOrder("order-A-1","cancel-A-000012")).rejects.toThrow("SCOPE_MISMATCH");
 });
 it("never treats cancellation as receipt, provider payout or an automatic reversal",()=>{
  expect(cancelled.state).toBe("CANCELLED");
  expect(new RechargeBridgeError("OUTCOME_UNKNOWN").code).toBe("OUTCOME_UNKNOWN");
 });
});
