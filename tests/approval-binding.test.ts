import {describe,expect,it} from "vitest";
import {approvalBindingDigest,approvedOperationMatches,type ApprovalBinding} from "@/core/security/approval-binding";
const base:ApprovalBinding={
 tenantId:"tenant-1",branchId:"branch-1",actorId:"actor-1",requestId:"request-1",
 action:"sale.return",amountMinor:"1400",currency:"USD",
 operation:{invoice:"INV-9",items:[{id:"sku-3",quantity:1}],reason:"Customer return"},
};
describe("A1 Trust provider-neutral approval binding",()=>{
 it("binds approval to the actual operation and full scope",()=>{
   const hash=approvalBindingDigest(base);
   expect(approvedOperationMatches(base,hash)).toBe(true);
   for(const changed of [
     {...base,tenantId:"other-tenant"}, {...base,branchId:"branch-2"},
     {...base,actorId:"other-user"}, {...base,amountMinor:"1401"},
     {...base,action:"product.price.change" as const},
     {...base,operation:{...base.operation,reason:"Changed after approval"}},
     {...base,requestId:"request-2"},
   ])expect(approvedOperationMatches(changed,hash)).toBe(false);
 });
 it("sorts properties deterministically while preserving array order",()=>{
   const switched={...base,operation:{reason:"Customer return",items:[{quantity:1,id:"sku-3"}],invoice:"INV-9"}};
   expect(approvalBindingDigest(switched)).toBe(approvalBindingDigest(base));
   expect(approvedOperationMatches(base,"invalid")).toBe(false);
 });
});
