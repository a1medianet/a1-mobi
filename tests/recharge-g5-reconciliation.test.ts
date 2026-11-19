import {describe,it,expect} from "vitest";
import {summarizeRechargeReconciliation} from "@/modules/recharge-bridge/reconciliation";
const make=(items:Array<{eventId:string;rechargeOrderId:string;version:number;state:string}>,hasMore=false)=>
 ({items,nextCursor:String(items.length),hasMore,sandbox:true as const});
describe("Recharge G5 read-only reconciliation — no cashier side effects",()=>{
 it("shows missing webhook events as backlog, never as a failed payment",()=>{
  const out=summarizeRechargeReconciliation(make([
   {eventId:"event_A_0001",rechargeOrderId:"order_A",version:1,state:"PENDING"},
  ]),[]);
  expect(out).toMatchObject({status:"DELIVERY_BACKLOG",missingEventIds:["event_A_0001"],
   financePosted:false,readOnly:true,complete:false});
 });
 it("reports matching source/inbox one-page evidence but not global PASS",()=>{
  const event={eventId:"event_A_0001",rechargeOrderId:"order_A",version:1,state:"PENDING"};
  const result=summarizeRechargeReconciliation(make([event]),[{...event,orderVersion:1}]);
  expect(result).toMatchObject({status:"PAGE_MATCHED",complete:false,missingEventIds:[]});
 });
 it("detects mismatched state, order ID or version",()=>{
  const event={eventId:"event_A_0001",rechargeOrderId:"order_A",version:2,state:"CANCELLED"};
  const result=summarizeRechargeReconciliation(make([event]),[{
    eventId:event.eventId,rechargeOrderId:"order_B",orderVersion:1,state:"PENDING",
  }]);
  expect(result.status).toBe("REVIEW_REQUIRED");
  expect(result.conflictingEventIds).toEqual([event.eventId]);
 });
 it("detects ordering gaps and partial-page limitations",()=>{
  const events=[
   {eventId:"event_A_0001",rechargeOrderId:"order_A",version:1,state:"PENDING"},
   {eventId:"event_A_0003",rechargeOrderId:"order_A",version:3,state:"CANCELLED"},
  ];
  const result=summarizeRechargeReconciliation(make(events,true),[]);
  expect(result.versionGapOrderIds).toEqual(["order_A"]);
  expect(result.status).toBe("REVIEW_REQUIRED");
  expect(result.hasMore).toBe(true);
 });
 it("requires more source pages before claiming a reconciled state",()=>{
  const result=summarizeRechargeReconciliation(make([],true),[]);
  expect(result.status).toBe("MORE_PAGES_REQUIRED");
  expect(result.complete).toBe(false);
 });
 it("rejects duplicate inbox IDs or oversized source pages",()=>{
  const event={eventId:"event_A_0001",rechargeOrderId:"order_A",version:1,state:"PENDING"};
  const stored={...event,orderVersion:1};
  expect(()=>summarizeRechargeReconciliation(make([event]),[stored,stored]))
   .toThrow("DUPLICATE_INBOX_ID");
  expect(()=>summarizeRechargeReconciliation(make(Array(51).fill(event)),[]))
   .toThrow("INVALID_RECONCILIATION_DATA");
 });
});
