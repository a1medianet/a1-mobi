import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, DebtEntryKind } from "@prisma/client";
vi.mock("server-only",()=>({}));
vi.mock("@/server/db",()=>({db:{$transaction:vi.fn()}}));
import { db } from "@/server/db";
import { recordManualDebt } from "@/modules/debt/manual-debt";

const decimal=(s:string)=>new Prisma.Decimal(s);
function createTx(balance="0"){
  const entries=balance==="0"?[]:[{branchId:"b",kind:DebtEntryKind.CHARGE,amount:decimal("5")}];
  return {
    debtEntry:{findUnique:vi.fn().mockResolvedValue(null),
      findMany:vi.fn().mockResolvedValue(entries),
      create:vi.fn().mockImplementation(async ({data})=>({id:"entry",...data}))},
    customer:{findFirst:vi.fn().mockResolvedValue({id:"customer123"})},
    debtAccount:{findFirst:vi.fn().mockResolvedValue({id:"debt1",tenantId:"t",currency:"USD",balance:decimal(balance)}),
      update:vi.fn().mockResolvedValue({})},
    branch:{findFirst:vi.fn().mockResolvedValue({id:"b"})},
    user:{findFirst:vi.fn().mockResolvedValue({id:"actor"})},
    exchangeRate:{findFirst:vi.fn().mockResolvedValue({id:"rate1",rate:decimal("89500"),
      baseCurrency:"USD",quoteCurrency:"LBP",effectiveAt:new Date()})},
    auditEvent:{create:vi.fn().mockResolvedValue({})},
  };
}
const base={tenantId:"t",branchId:"b",actorId:"actor",
  customerId:"customer123",amount:"10",currency:"USD" as const,
  reason:"Recorded invoice balance",idempotencyKey:"unique-key"};
describe("manual debt posting safeguards",()=>{
  beforeEach(()=>vi.clearAllMocks());
  it("posts owner-authorized adjustment with a historical audit record",async()=>{
    const tx=createTx();
    vi.mocked(db.$transaction).mockImplementation((async(callback:unknown)=>
      (callback as (transaction:ReturnType<typeof createTx>)=>Promise<unknown>)(tx)) as never);
    const result=await recordManualDebt(base);
    expect(result.id).toBe("entry");
    expect(tx.debtAccount.update).toHaveBeenCalled();
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });
  it("rejects inconsistent accounts without writing a debt",async()=>{
    const tx=createTx("9");
    vi.mocked(db.$transaction).mockImplementation((async(callback:unknown)=>
      (callback as (transaction:ReturnType<typeof createTx>)=>Promise<unknown>)(tx)) as never);
    await expect(recordManualDebt(base)).rejects.toThrow("DEBT_RECONCILIATION_REQUIRED");
    expect(tx.debtEntry.create).not.toHaveBeenCalled();
  });
  it("converts LBP with branch rate without changing the original currency evidence",async()=>{
    const tx=createTx();
    vi.mocked(db.$transaction).mockImplementation((async(callback:unknown)=>
      (callback as (transaction:ReturnType<typeof createTx>)=>Promise<unknown>)(tx)) as never);
    await recordManualDebt({...base,currency:"LBP",amount:"895000"});
    expect(tx.debtEntry.create).toHaveBeenCalledWith(expect.objectContaining({
      data:expect.objectContaining({amount:decimal("10")}),
    }));
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data:expect.objectContaining({after:expect.objectContaining({
        originalAmount:"895000",originalCurrency:"LBP",bookedAmount:"10",rateId:"rate1",
      })}),
    }));
  });
});
