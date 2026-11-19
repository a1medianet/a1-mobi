import {beforeEach,describe,expect,it,vi} from "vitest";
const mock=vi.hoisted(()=>({
 findFirst:vi.fn(),create:vi.fn(),update:vi.fn(),updateMany:vi.fn(),
 auditCreate:vi.fn(),
}));
vi.mock("@/server/db",()=>({db:{
 rechargeOrderIntent:{findFirst:mock.findFirst,create:mock.create,update:mock.update,updateMany:mock.updateMany},
 rechargeOrderIntentAudit:{create:mock.auditCreate},
}}));
import {dispatchOriginalIntent,findOutstandingIntent,refreshStoredIntent} from "@/modules/recharge-bridge/order-intent";
import {RechargeBridgeError} from "@/modules/recharge-bridge/receiver";
const scope={tenantId:"tenant-a",branchId:"branch-a",actorId:"actor-a"};
const req={quoteId:"quote-1",recipient:"test-number-001",externalRef:"ref-123456789012",idempotencyKey:"key-123456789012"};
const row={id:"intent-1",...scope,quoteId:req.quoteId,externalRef:req.externalRef,idempotencyKey:req.idempotencyKey,
 recipientHash:"digest",requestHash:"",rechargeOrderId:null,orderState:null,orderVersion:null,
 status:"DISPATCHING",reconciliationStatus:"NEEDS_SOURCE_LOOKUP",createdAt:new Date(),updatedAt:new Date()};
describe("G5 durable POST intent (fail-closed)",()=>{
 beforeEach(()=>{vi.resetAllMocks();mock.findFirst.mockResolvedValue(null);
  mock.create.mockImplementation(async ({data})=>({...row,...data,requestHash:data.requestHash}));
  mock.updateMany.mockResolvedValue({count:1});mock.auditCreate.mockResolvedValue({});
 });
 it("records the original intent before network dispatch and never retries unknown",async()=>{
  const outbound=vi.fn().mockRejectedValue(new Error("network timeout"));
  await expect(dispatchOriginalIntent(scope,req,outbound)).rejects.toMatchObject({code:"RECHARGE_OUTCOME_UNKNOWN"});
  expect(mock.create).toHaveBeenCalledTimes(1);
  expect(outbound).toHaveBeenCalledTimes(1);
  expect(mock.updateMany).toHaveBeenCalledWith({where:{id:"intent-1",status:"DISPATCHING"},
   data:{status:"OUTCOME_UNKNOWN",reconciliationStatus:"NEEDS_SOURCE_LOOKUP"}});
  const persisted=mock.create.mock.calls[0][0].data;
  expect(persisted.recipient).toBeUndefined();
  expect(persisted.recipientHash).toMatch(/^[0-9a-f]{64}$/);
  mock.findFirst.mockResolvedValue({...row,...persisted,status:"OUTCOME_UNKNOWN"});
  const replay=await dispatchOriginalIntent(scope,req,outbound);
  expect(replay).toMatchObject({order:null,replayed:true,intent:{status:"OUTCOME_UNKNOWN"}});
  expect(outbound).toHaveBeenCalledTimes(1);
 });
 it("holds the original intent if a previous unresolved attempt exists",async()=>{
  mock.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({...row,status:"OUTCOME_UNKNOWN"});
  const outbound=vi.fn();
  await expect(dispatchOriginalIntent(scope,req,outbound)).rejects.toMatchObject({code:"UNRESOLVED_ORIGINAL_INTENT"});
  expect(outbound).not.toHaveBeenCalled();
 });
 it("persists a scoped acknowledged order and reads it without a second POST",async()=>{
  const order={rechargeOrderId:"order-1",externalRef:req.externalRef,merchantId:"a",branchId:"a",
   state:"PENDING" as const,version:1};
  mock.update.mockImplementation(async ({data})=>({...row,...data,status:"ACKNOWLEDGED",rechargeOrderId:"order-1"}));
  const outbound=vi.fn().mockResolvedValue(order);
  const first=await dispatchOriginalIntent(scope,req,outbound);
  expect(first).toMatchObject({replayed:false,order:{rechargeOrderId:"order-1"}});
  expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({where:{id:"intent-1"}}));
  expect(outbound).toHaveBeenCalledTimes(1);
 });
 it("does not claim source reconciliation when original order ID is unavailable",async()=>{
  mock.findFirst.mockResolvedValue({...row,status:"OUTCOME_UNKNOWN"});
  const getter=vi.fn();
  const value=await refreshStoredIntent(scope,"intent-1",getter);
  expect(value.sourceLookupAvailable).toBe(false);
  expect(getter).not.toHaveBeenCalled();
 });

 it("resolves a lost response by scoped externalRef GET after restart, never POSTs twice",async()=>{
  mock.findFirst.mockResolvedValue({...row,status:"OUTCOME_UNKNOWN"});
  mock.update.mockImplementation(async({data})=>({...row,...data,status:"ACKNOWLEDGED"}));
  const accepted={rechargeOrderId:"source-order-1",merchantId:"merchant-a",branchId:"provider-a",
   externalRef:req.externalRef,state:"PENDING" as const,version:1};
  const lookupRef=vi.fn().mockResolvedValue(accepted);
  const getById=vi.fn();
  const restored=await refreshStoredIntent(scope,"intent-1",getById,lookupRef);
  expect(restored).toMatchObject({sourceLookupAvailable:true,order:{rechargeOrderId:"source-order-1"},
   intent:{rechargeOrderId:"source-order-1",status:"ACKNOWLEDGED"}});
  expect(lookupRef).toHaveBeenCalledExactlyOnceWith(req.externalRef);
  expect(getById).not.toHaveBeenCalled();
  expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({
   where:{id:"intent-1"},data:expect.objectContaining({rechargeOrderId:"source-order-1",
    status:"ACKNOWLEDGED",reconciliationStatus:"SOURCE_VERIFIED"}),
  }));
 });
 it("404 read by original ref stays unresolved, without claiming a missing order",async()=>{
  mock.findFirst.mockResolvedValue({...row,status:"OUTCOME_UNKNOWN"});
  const byRef=vi.fn().mockRejectedValue(Object.assign(new RechargeBridgeError("NOT_FOUND",404),{code:"NOT_FOUND",status:404}));
  const value=await refreshStoredIntent(scope,"intent-1",vi.fn(),byRef);
  expect(value).toMatchObject({sourceLookupAvailable:false,intent:{status:"OUTCOME_UNKNOWN"}});
  expect(mock.update).not.toHaveBeenCalled();
 });
 it("rejects cross-order original reference mismatch without updating durable intent",async()=>{
  mock.findFirst.mockResolvedValue({...row,status:"OUTCOME_UNKNOWN"});
  const byRef=vi.fn().mockResolvedValue({rechargeOrderId:"order-else",externalRef:"wrong-reference",
    merchantId:"merchant-a",branchId:"branch-a",state:"PENDING",version:1});
  await expect(refreshStoredIntent(scope,"intent-1",vi.fn(),byRef)).rejects.toMatchObject({
   code:"ORDER_IDENTITY_MISMATCH",status:409,
  });
  expect(mock.update).not.toHaveBeenCalled();
 });
 it("limits outstanding lookups to tenant, branch and actor",async()=>{
  await findOutstandingIntent(scope);
  expect(mock.findFirst).toHaveBeenCalledWith({where:{
   ...scope,status:{in:["DISPATCHING","OUTCOME_UNKNOWN"]},
  },orderBy:{createdAt:"asc"}});
 });
});
