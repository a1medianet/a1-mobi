import {describe,expect,it} from "vitest";
import {eventInboxDecision,signedEvent,verifyIncomingRechargeEvent} from "@/modules/recharge-bridge/webhook";
const secret="safe-sandbox-secret-with-32-characters-plus";
const now=1794910000000;
const scope={merchantId:"merchant-A",branchId:"branch-A"};
const event={eventId:"evt-12345678",occurredAt:new Date(now).toISOString(),...scope,
 rechargeOrderId:"r1",externalRef:"m1",state:"PROCESSING",version:2,requiresReconciliation:true};
const packet=(payload:unknown=event,timestamp=now,eventId=event.eventId)=>{
 const rawBody=JSON.stringify(payload);
 return {secret,timestamp,eventId,rawBody,scope,now,
 signature:signedEvent(secret,timestamp,eventId,rawBody)};
};
describe("G5 Recharge webhook acceptance policy (sandbox only)",()=>{
 it("verifies exact raw bytes, scoped payload and correlation identifiers",()=>{
  const result=verifyIncomingRechargeEvent(packet());
  expect(result.event.eventId).toBe(event.eventId);
  expect(result.order.branchId).toBe(scope.branchId);
  expect(result.order.requiresReconciliation).toBe(true);
 });
 it("refuses altered bytes and signatures",()=>{
  const p=packet();
  expect(()=>verifyIncomingRechargeEvent({...p,rawBody:p.rawBody+" "})).toThrow("INVALID_SIGNATURE");
  expect(()=>verifyIncomingRechargeEvent({...p,signature:"0".repeat(64)})).toThrow("INVALID_SIGNATURE");
 });
 it("rejects expired timestamps and mismatched event ids",()=>{
  expect(()=>verifyIncomingRechargeEvent(packet(event,now-300001))).toThrow("STALE_WEBHOOK");
  expect(()=>verifyIncomingRechargeEvent(packet(event,now,"evt-mismatch"))).toThrow("EVENT_ID_MISMATCH");
 });
 it("rejects cross-merchant and cross-branch events",()=>{
  expect(()=>verifyIncomingRechargeEvent(packet({...event,merchantId:"merchant-B"}))).toThrow("SCOPE_MISMATCH");
  expect(()=>verifyIncomingRechargeEvent(packet({...event,branchId:"branch-B"}))).toThrow("SCOPE_MISMATCH");
 });
 it("acknowledges only identical duplicate inbox events and refuses collisions",()=>{
  expect(eventInboxDecision(undefined,"hash1")).toBe("INSERT");
  expect(eventInboxDecision("hash1","hash1")).toBe("ACK_DUPLICATE");
  expect(()=>eventInboxDecision("hash1","hash2")).toThrow("EVENT_ID_COLLISION");
 });
});
