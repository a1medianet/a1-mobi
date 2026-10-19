import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/server/db",()=>({db:{
  sale:{aggregate:vi.fn()},saleReturn:{aggregate:vi.fn()},
  payment:{aggregate:vi.fn()},repairOrder:{count:vi.fn()},
  customer:{count:vi.fn()},cashSession:{aggregate:vi.fn()},
}}));
vi.mock("@/server/auth-http",()=>({currentStoreContext:vi.fn()}));
const {db}=await import("@/server/db");
const {currentStoreContext}=await import("@/server/auth-http");
const {getBranchOperatingReport}=await import("@/modules/reports/branch-operating-report");
const {default:BranchOwnerReport}=await import("@/components/branch-owner-report");
const {default:ReportsPage}=await import("@/app/[locale]/reports/page");

const scope={tenantId:"tenant-A",branchId:"branch-A"};
const now=new Date("2026-10-19T10:00:00Z");
beforeEach(()=>{
 vi.clearAllMocks();
 vi.mocked(currentStoreContext).mockResolvedValue({...scope,actorId:"owner",
   permissions:new Set(["reports.read"])} as never);
 vi.mocked(db.sale.aggregate).mockResolvedValue({_sum:{total:650},_count:{_all:3}} as never);
 vi.mocked(db.saleReturn.aggregate).mockResolvedValue({_sum:{refundBase:120},_count:{_all:1}} as never);
 vi.mocked(db.payment.aggregate).mockResolvedValue({_sum:{baseAmount:90}} as never);
 vi.mocked(db.repairOrder.count).mockResolvedValue(5);
 vi.mocked(db.customer.count).mockResolvedValue(2);
 vi.mocked(db.cashSession.aggregate).mockResolvedValue({_sum:{varianceBase:-3}} as never);
});

describe("C-13 owner reports branch-safe read model",()=>{
 it("separates gross posted records, posted returns and real collected repair payments",async()=>{
  const data=await getBranchOperatingReport({...scope,now});
  expect(data).toMatchObject({
    grossRecordedSalesUsd:650,postedReturnsUsd:120,salesAfterReturnsUsd:530,
    repairCollectedUsd:90,cashClosedVarianceUsd:-3,
    saleCount:3,returnCount:1,openRepairs:5,registeredCustomers:2,
  });
  const range={gte:new Date(now.getTime()-30*86400000),lt:now};
  expect(db.sale.aggregate).toHaveBeenCalledWith(expect.objectContaining({
    where:expect.objectContaining({...scope,occurredAt:range}),
  }));
  expect(db.saleReturn.aggregate).toHaveBeenCalledWith(expect.objectContaining({
    where:{...scope,occurredAt:range,status:"POSTED"},
  }));
  expect(db.payment.aggregate).toHaveBeenCalledWith(expect.objectContaining({
    where:{...scope,paidAt:range,status:"POSTED",repairOrderId:{not:null}},
  }));
  expect(db.repairOrder.count).toHaveBeenCalledWith({where:expect.objectContaining(scope)});
  expect(db.customer.count).toHaveBeenCalledWith({where:{
    tenantId:scope.tenantId,createdBranchId:scope.branchId,
  }});
  expect(db.cashSession.aggregate).toHaveBeenCalledWith(expect.objectContaining({
    where:{...scope,status:"CLOSED",closedAt:range},
  }));
 });

 it("returns real zeroes when no entries are posted, not demo sample values",async()=>{
  vi.mocked(db.sale.aggregate).mockResolvedValue({_sum:{total:null},_count:{_all:0}} as never);
  vi.mocked(db.saleReturn.aggregate).mockResolvedValue({_sum:{refundBase:null},_count:{_all:0}} as never);
  vi.mocked(db.payment.aggregate).mockResolvedValue({_sum:{baseAmount:null}} as never);
  vi.mocked(db.cashSession.aggregate).mockResolvedValue({_sum:{varianceBase:null}} as never);
  const data=await getBranchOperatingReport({...scope,now});
  expect(data.grossRecordedSalesUsd).toBe(0);
  expect(data.salesAfterReturnsUsd).toBe(0);
  expect(data.repairCollectedUsd).toBe(0);
 });

 it("refuses missing tenant, missing branch, and invalid periods before querying",async()=>{
  await expect(getBranchOperatingReport({tenantId:"",branchId:"x"})).rejects.toThrow("REPORT_SCOPE_REQUIRED");
  await expect(getBranchOperatingReport({tenantId:"x",branchId:""})).rejects.toThrow("REPORT_SCOPE_REQUIRED");
  await expect(getBranchOperatingReport({...scope,now:new Date("invalid")})).rejects.toThrow("INVALID_REPORT_WINDOW");
  expect(db.sale.aggregate).not.toHaveBeenCalled();
 });

 it("enforces reports.read permission before querying underlying data",async()=>{
  vi.mocked(currentStoreContext).mockRejectedValue(new Error("PERMISSION_DENIED"));
  const denied=await BranchOwnerReport({locale:"ar"});
  expect(denied.props.children.props.children).toContain("ليس لديك إذن");
  expect(currentStoreContext).toHaveBeenCalledWith("reports.read");
  expect(db.sale.aggregate).not.toHaveBeenCalled();
 });

 it("keeps the original pilot when gate is OFF",async()=>{
  const old=process.env.A1_MOBI_C_LIVE_01_ENABLED;
  try{
    process.env.A1_MOBI_C_LIVE_01_ENABLED="0";
    expect((await ReportsPage({params:Promise.resolve({locale:"ar"})})).type).toBe("main");
    process.env.A1_MOBI_C_LIVE_01_ENABLED="1";
    expect((await ReportsPage({params:Promise.resolve({locale:"ar"})})).type).toBe(BranchOwnerReport);
  }finally{
    if(old===undefined)delete process.env.A1_MOBI_C_LIVE_01_ENABLED;
    else process.env.A1_MOBI_C_LIVE_01_ENABLED=old;
  }
 });
});
