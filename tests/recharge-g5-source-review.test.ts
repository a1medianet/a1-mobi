import {describe,expect,it,vi} from "vitest";
import {createRechargeReceiver} from "@/modules/recharge-bridge/receiver";

const merchantId="merchant-sandbox-A",branchId="branch-sandbox-A";
const report={
 rechargeOrderId:"sandbox-order-1",merchantId,branchId,
 sandboxOnly:true,customerCashEntriesIncluded:false,
 state:"PENDING",version:1,providerEvidence:"DEMO_ONLY",
 transport:{allDelivered:false,needsOperatorReview:true,fulfillmentConfirmedByCarrier:false},
 events:[{eventId:"sandbox-event-1",state:"PENDING",version:1}],
 supplierEntries:[{kind:"PAYABLE",amountMinor:120,currency:"USD"}],
};
const letters={
 sandboxOnly:true,immutableUntilReviewed:true,
 mayReplay:false,mayAcknowledge:false,mayPostFinance:false,
 items:[{eventId:"sandbox-event-1",lastError:"HTTP_409"}],
};
function receiver(response:unknown){
 const transport=vi.fn(async()=>response);
 const api=createRechargeReceiver({merchantId,branchId,transport,
  env:{A1_MOBI_RECHARGE_SANDBOX_ENABLED:"1"}});
 return {api,transport};
}
describe("G5 Recharge source-of-truth reads remain scoped and non-mutating",()=>{
 it("reads the real source reconciliation contract via GET, never sends payment or retry",async()=>{
  const {api,transport}=receiver(report);
  const result=await api.sourceReconciliation("sandbox-order-1");
  expect(result).toEqual(report);
  expect(transport).toHaveBeenCalledExactlyOnceWith(
   "/v1/reconciliation/orders/sandbox-order-1",{method:"GET"});
 });
 it("rejects a different merchant, branch or source order identity",async()=>{
  for(const change of [
   {merchantId:"merchant-sandbox-B"},{branchId:"branch-sandbox-B"},
   {rechargeOrderId:"sandbox-order-2"},
  ]){
   const {api}=receiver({...report,...change});
   await expect(api.sourceReconciliation("sandbox-order-1")).rejects.toMatchObject({
    code:"SCOPE_MISMATCH",status:403,
   });
  }
 });
 it("refuses source reports that imply actual carrier fulfillment in sandbox",async()=>{
  const {api}=receiver({...report,transport:{fulfillmentConfirmedByCarrier:true}});
  await expect(api.sourceReconciliation("sandbox-order-1")).rejects.toMatchObject({
   code:"INVALID_SOURCE_RECONCILIATION",status:502,
  });
 });
 it("allows read-only dead-letter inspection with immutable source flags",async()=>{
  const {api,transport}=receiver(letters);
  expect(await api.sourceDeadLetters(50)).toEqual(letters);
  expect(transport).toHaveBeenCalledExactlyOnceWith(
   "/v1/reconciliation/dead-letters?limit=50",{method:"GET"});
 });
 it("fails closed on changed DEAD queue safety flags or oversized limits",async()=>{
  for(const altered of [{mayReplay:true},{mayAcknowledge:true},{mayPostFinance:true}]){
   const {api}=receiver({...letters,...altered});
   await expect(api.sourceDeadLetters(50)).rejects.toMatchObject({code:"INVALID_SOURCE_DEAD_LETTERS"});
  }
  const {api}=receiver(letters);
  await expect(api.sourceDeadLetters(101)).rejects.toMatchObject({code:"INVALID_RECONCILIATION_LIMIT"});
 });
});