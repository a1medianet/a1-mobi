import { beforeEach, describe, expect, it, vi } from "vitest";
import { RepairStatus, RepairPartSource } from "@prisma/client";

const mocks=vi.hoisted(()=>({
 repairFind:vi.fn(), userFind:vi.fn(), approvalCreate:vi.fn(),
 partCreate:vi.fn(), repairUpdate:vi.fn(),
}));
vi.mock("@/server/db",()=>({db:{
 $transaction: async (callback:(tx:unknown)=>Promise<unknown>) => callback({
  repairOrder:{findUniqueOrThrow:mocks.repairFind,update:mocks.repairUpdate},
  user:{findUniqueOrThrow:mocks.userFind},
  repairApproval:{create:mocks.approvalCreate},
  repairPart:{create:mocks.partCreate},
 }),
}}));
import { addRepairPart, approveRepairEstimate, finalizeRepairFinancials } from "@/modules/repairs/repair-service";

const input={tenantId:"tenant-a",branchId:"branch-b",actorId:"actor-a",repairOrderId:"repair-a"};
describe("repair service branch protection (same tenant different branches)",()=>{
 beforeEach(()=>{
  vi.clearAllMocks();
  mocks.userFind.mockResolvedValue({id:"actor-a",tenantId:"tenant-a"});
  mocks.repairFind.mockResolvedValue({
   id:"repair-a",tenantId:"tenant-a",branchId:"branch-a",
   status:RepairStatus.ESTIMATE_PENDING,estimateAmount:120,
   parts:[],paidTotal:0,
  });
 });
 it("rejects estimate approval for a repair in another branch before recording an approval",async()=>{
  await expect(approveRepairEstimate({...input,approved:true}))
   .rejects.toThrow("Cross-branch approval");
  expect(mocks.approvalCreate).not.toHaveBeenCalled();
 });
 it("rejects repair parts attached to a ticket from another branch",async()=>{
  await expect(addRepairPart({...input,source:RepairPartSource.EXTERNAL,
   description:"Display",quantity:1,unitCost:20,idempotencyKey:"unique-part-12345"}))
   .rejects.toThrow("Cross-branch repair part");
  expect(mocks.partCreate).not.toHaveBeenCalled();
 });
 it("rejects financial finalization for another branch",async()=>{
  await expect(finalizeRepairFinancials({...input,finalPrice:120,laborCost:25,directCost:5}))
   .rejects.toThrow("Cross-branch financial finalization");
  expect(mocks.repairUpdate).not.toHaveBeenCalled();
 });
 it("does not change delivered ticket financials",async()=>{
  mocks.repairFind.mockResolvedValue({id:"repair-a",tenantId:"tenant-a",branchId:"branch-b",status:RepairStatus.DELIVERED,estimateAmount:120,parts:[],paidTotal:0});
  await expect(finalizeRepairFinancials({...input,finalPrice:120,laborCost:25,directCost:5}))
   .rejects.toThrow("REPAIR_NOT_IN_PROGRESS");
  expect(mocks.repairUpdate).not.toHaveBeenCalled();
 });
});
