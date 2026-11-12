import {beforeEach,describe,expect,it,vi} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
const m=vi.hoisted(()=>({
 context:vi.fn(),branch:vi.fn(),products:vi.fn(),devices:vi.fn(),
 sales:vi.fn(),salesCount:vi.fn(),saleRows:vi.fn(),repairs:vi.fn(),repairRows:vi.fn(),
 topups:vi.fn(),topupRows:vi.fn()
}));
vi.mock("@/server/auth-http",()=>({currentStoreContext:m.context}));
vi.mock("@/server/db",()=>({db:{
 branch:{findFirst:m.branch},product:{count:m.products},serializedDevice:{count:m.devices},
 sale:{aggregate:m.sales,count:m.salesCount,findMany:m.saleRows},repairOrder:{count:m.repairs,findMany:m.repairRows},
 topUpTransaction:{count:m.topups,findMany:m.topupRows}
}}));
import {StoreHome} from "@/components/store-home";
describe("approved original dashboard uses live store records",()=>{
 beforeEach(()=>{
  vi.clearAllMocks();
  m.context.mockResolvedValue({tenantId:"tenant-a",branchId:"branch-b"});
  m.branch.mockResolvedValue({name:"Actual branch"});
  m.products.mockResolvedValue(0);m.devices.mockResolvedValue(0);
  m.sales.mockResolvedValue({_count:{_all:0},_sum:{total:null}});m.salesCount.mockResolvedValue(0);
  m.repairs.mockResolvedValue(0);m.topups.mockResolvedValue(0);
  m.saleRows.mockResolvedValue([]);m.repairRows.mockResolvedValue([]);m.topupRows.mockResolvedValue([]);
 });
 it("preserves four illustrated actions and shows actual zero-state not demos",async()=>{
  const html=renderToStaticMarkup(await StoreHome({locale:"ar"}));
  expect(html).toContain("mobi-c-spotlight");
  expect(html.match(/class="mobi-c-action /g)?.length).toBe(4);
  expect(html).toContain("Actual branch");
  expect(html).toContain("0");
  expect(html).not.toMatch(/2,284|1,612|REP-1042|INV-3108|mock|practice mode|demo-chip/);
  expect(m.products).toHaveBeenCalledWith({where:{tenantId:"tenant-a",isActive:true}});
  expect(m.sales).toHaveBeenCalledWith(expect.objectContaining({
   where:{tenantId:"tenant-a",branchId:"branch-b",status:"COMPLETED",baseCurrency:"USD"}
  }));
  expect(m.devices).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({
   tenantId:"tenant-a",stockLocation:{is:{tenantId:"tenant-a",branchId:"branch-b"}}
  })}));
 });
 it("with database failures hides fabricated counts and gives an error",async()=>{
  m.products.mockRejectedValueOnce(new Error("DB unreachable"));
  const html=renderToStaticMarkup(await StoreHome({locale:"en"}));
  expect(html).toContain("could not be loaded");
  expect(html).not.toContain("Store overview");
  expect(html).not.toContain("Actual branch");
  expect(html).not.toContain("2,284");
 });
});
