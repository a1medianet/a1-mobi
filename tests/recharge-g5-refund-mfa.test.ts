import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {CashDirection,CashMovementType,InvoiceStatus,PaymentStatus,Prisma,SaleStatus} from "@prisma/client";

const mock=vi.hoisted(()=>({
 cashFind:vi.fn(),returnFind:vi.fn(),txReturnFind:vi.fn(),
 saleFind:vi.fn(),cashSessionFind:vi.fn(),credentialFind:vi.fn(),
 returnCreate:vi.fn(),cashCreate:vi.fn(),paymentUpdate:vi.fn(),
 invoiceUpdate:vi.fn(),saleUpdate:vi.fn(),factor:vi.fn(),budget:vi.fn(),
}));
vi.mock("@/server/mfa-service",()=>({verifyUserSecondFactor:mock.factor}));
vi.mock("@/server/attempt-budget",()=>({consumeSensitiveActionBudget:mock.budget}));
vi.mock("@/server/db",()=>({db:{
 cashMovement:{findUnique:mock.cashFind},
 saleReturn:{findUnique:mock.returnFind},
 $transaction:async(fn:(tx:unknown)=>Promise<unknown>)=>fn({
  saleReturn:{findUnique:mock.txReturnFind,create:mock.returnCreate},
  sale:{findUnique:mock.saleFind,update:mock.saleUpdate},
  cashSession:{findFirst:mock.cashSessionFind},
  mfaCredential:{findUnique:mock.credentialFind},
  cashMovement:{create:mock.cashCreate},
  payment:{update:mock.paymentUpdate},invoice:{update:mock.invoiceUpdate},
 }),
}}));

import {refundSyntheticG5Sale} from "@/modules/recharge-bridge/mobi-refund";
const orderId="synthetic-refund-order-1";
const input={
 tenantId:"test-tenant-a",branchId:"test-branch-a",actorId:"manager-a",mfaCode:"123456",
 order:{
  rechargeOrderId:orderId,state:"FAILED",externalRef:"mobi-g5-test-ref-001",
  currency:"USD",totalMinor:150,
 } as Parameters<typeof refundSyntheticG5Sale>[0]["order"],
};
describe("G5 sandbox refund MFA is fail-closed and precedes all financial writes",()=>{
 beforeEach(()=>{
  vi.resetAllMocks();
  vi.stubEnv("A1_MOBI_RECHARGE_ADAPTER_ENABLED","true");
  vi.stubEnv("A1_RECHARGE_SANDBOX_ONLY","true");
  vi.stubEnv("A1_MOBI_RECHARGE_REAL_MONEY_ENABLED","0");
  mock.cashFind.mockResolvedValue(null);
  mock.returnFind.mockResolvedValue(null);
  mock.txReturnFind.mockResolvedValue(null);
  mock.budget.mockResolvedValue(undefined);
  mock.saleFind.mockResolvedValue({
   id:"sale-a",tenantId:input.tenantId,branchId:input.branchId,
   status:SaleStatus.COMPLETED,total:new Prisma.Decimal("1.50"),
   paidTotal:new Prisma.Decimal("1.50"),baseCurrency:"USD",
   invoice:{id:"invoice-a",status:InvoiceStatus.ISSUED,snapshot:{rechargeOrderId:orderId}},
   payments:[{id:"payment-a",status:PaymentStatus.POSTED}],
  });
  mock.cashSessionFind.mockResolvedValue({id:"cash-session-a"});
  mock.returnCreate.mockResolvedValue({id:"return-a"});
  mock.cashCreate.mockResolvedValue({id:"cash-out-a"});
  mock.paymentUpdate.mockResolvedValue({});
  mock.invoiceUpdate.mockResolvedValue({});
  mock.saleUpdate.mockResolvedValue({});
 });
 afterEach(()=>vi.unstubAllEnvs());
 it("refuses a manager without enrolled MFA before any refund write",async()=>{
  mock.credentialFind.mockResolvedValue(null);
  await expect(refundSyntheticG5Sale(input)).rejects.toMatchObject({
   code:"REFUND_MFA_ENROLLMENT_REQUIRED",status:403,
  });
  expect(mock.factor).not.toHaveBeenCalled();
  expect(mock.returnCreate).not.toHaveBeenCalled();
  expect(mock.cashCreate).not.toHaveBeenCalled();
 });
 it("refuses an invalid one-time code without posting a refund",async()=>{
  mock.credentialFind.mockResolvedValue({enabledAt:new Date()});
  mock.factor.mockRejectedValue(new Error("INVALID_MFA"));
  await expect(refundSyntheticG5Sale(input)).rejects.toMatchObject({
   code:"REFUND_MFA_INVALID",status:403,
  });
  expect(mock.returnCreate).not.toHaveBeenCalled();
  expect(mock.cashCreate).not.toHaveBeenCalled();
 });
 it("posts one refund after a valid factor in the same serializable callback",async()=>{
  mock.credentialFind.mockResolvedValue({enabledAt:new Date()});
  mock.factor.mockResolvedValue({method:"totp"});
  const result=await refundSyntheticG5Sale(input);
  expect(result).toMatchObject({
   refundId:"return-a",cashMovementId:"cash-out-a",
   currency:"USD",amountMinor:150,replayed:false,financialOwner:"MOBI",
  });
  expect(mock.factor).toHaveBeenCalledWith(expect.anything(),input.actorId,input.mfaCode);
  expect(mock.cashCreate).toHaveBeenCalledWith({data:expect.objectContaining({
   direction:CashDirection.OUT,type:CashMovementType.REFUND,tenantId:input.tenantId,
   branchId:input.branchId,sourceId:"return-a",
  })});
  expect(mock.returnCreate).toHaveBeenCalledTimes(1);
  expect(mock.cashCreate).toHaveBeenCalledTimes(1);
 });
});
