import {beforeEach,describe,expect,it,vi} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
const m=vi.hoisted(()=>({
 context:vi.fn(),branch:vi.fn(),products:vi.fn(),devices:vi.fn(),
 sales:vi.fn(),salesCount:vi.fn(),saleRows:vi.fn(),repairs:vi.fn(),repairRows:vi.fn(),
 topups:vi.fn(),topupRows:vi.fn(), lowProducts:vi.fn(), locations:vi.fn(), stockRows:vi.fn(), serialRows:vi.fn()
}));
vi.mock("@/server/auth-http",()=>({currentStoreContext:m.context}));
vi.mock("@/server/db",()=>({db:{
 branch:{findFirst:m.branch},product:{count:m.products,findMany:m.lowProducts},serializedDevice:{count:m.devices,findMany:m.serialRows},
 stockLocation:{findMany:m.locations},stockMovement:{findMany:m.stockRows},
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
  m.lowProducts.mockResolvedValue([]);m.locations.mockResolvedValue([]);m.stockRows.mockResolvedValue([]);m.serialRows.mockResolvedValue([]);
 });
 it("preserves four illustrated actions and shows actual zero-state not demos",async()=>{
  const html=renderToStaticMarkup(await StoreHome({locale:"ar"}));
  expect(html).toContain("mobi-c-spotlight");
  expect(html.match(/class="mobi-c-action /g)?.length).toBe(4);
  expect(html).toContain("Actual branch");
  expect(html).toContain("0");
  // Every original section stays visible; only the record rows and bars are empty.
  expect(html).toContain('class="mobi-c-insight"');
  expect(html).toContain('class="mobi-c-ops-grid"');
  expect((html.match(/class="activity-card"/g)??[]).length).toBe(4);
  expect(html).toContain('لا توجد عمليات');
  expect(html).toContain('لا توجد تذاكر');
  expect(html).toContain('لا توجد حركة');
  expect(html).toContain('href="/ar/inventory"');
  expect(html).not.toMatch(/2,284|1,612|REP-1042|INV-3108|mock|practice mode|demo-chip/);
  expect(m.products).toHaveBeenCalledWith({where:{tenantId:"tenant-a",isActive:true}});
  expect(m.sales).toHaveBeenCalledWith(expect.objectContaining({
   where:{tenantId:"tenant-a",branchId:"branch-b",status:"COMPLETED",baseCurrency:"USD"}
  }));
  expect(m.devices).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({
   tenantId:"tenant-a",stockLocation:{is:{tenantId:"tenant-a",branchId:"branch-b"}}
  })}));
 });
 it("renders bars only for persisted transactions and keeps inventory shortcut",async()=>{
  m.salesCount.mockResolvedValue(2);
  m.repairs.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(1);
  m.topups.mockResolvedValue(1);
  const html=renderToStaticMarkup(await StoreHome({locale:"ar"}));
  expect(html).toContain('href="/ar/inventory"');
  expect(html).toContain('class="mobi-c-insight"');
  expect(html).toContain('style="height:50%"');
  expect((html.match(/style="height:25%"/g)??[]).length).toBe(2);
  expect(html).not.toContain("لا توجد عمليات مسجّلة بعد.");
 });
 it("shows true low-stock quantities per branch without counting stock from other locations",async()=>{
  m.lowProducts.mockResolvedValue([
   {id:"p1",sku:"PART-1",nameAr:"بطارية هاتف",nameEn:"Phone Battery",isSerialized:false,lowStockLevel:4},
   {id:"p2",sku:"PHONE-2",nameAr:"هاتف",nameEn:"Mobile",isSerialized:true,lowStockLevel:2},
  ]);
  m.locations.mockResolvedValue([{id:"branch-b-location"}]);
  m.stockRows.mockResolvedValue([
    {productId:"p1",quantity:3,fromLocationId:null,toLocationId:"branch-b-location"},
    {productId:"p1",quantity:1,fromLocationId:"branch-b-location",toLocationId:null},
    {productId:"p1",quantity:999,fromLocationId:null,toLocationId:"other-branch"},
  ]);
  m.serialRows.mockResolvedValue([{productId:"p2"}]);
  const html=renderToStaticMarkup(await StoreHome({locale:"en"}));
  expect(html).toContain("Low stock");
  expect(html).toContain("Phone Battery");
  expect(html).toContain("2 / 4");
  expect(html).toContain("1 / 2");
  expect(html).not.toContain("999 / 4");
  expect(m.locations).toHaveBeenCalledWith({where:{tenantId:"tenant-a",branchId:"branch-b"},select:{id:true}});
  expect(m.serialRows).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({
    tenantId:"tenant-a",status:"IN_STOCK",stockLocationId:{in:["branch-b-location"]},
  })}));
 });
 it("with database failures preserves every section and uses unavailable placeholders without invented data",async()=>{
  m.products.mockRejectedValueOnce(new Error("DB unreachable"));
  const html=renderToStaticMarkup(await StoreHome({locale:"en"}));
  expect(html).toContain("could not be loaded");
  expect(html).toContain("Store overview");
  expect(html).toContain("Start here");
  expect(html).toContain("Operation breakdown");
  expect(html).toContain("Recent repairs");
  expect(html).toContain("Recent sales");
  expect(html).toContain("Store activity");
  expect(html).toContain("Data temporarily unavailable");
  expect(html).not.toContain("Completed sales</p><strong><bdi dir=\"ltr\">0");
  expect(html).not.toContain("Actual branch");
  expect(html).not.toContain("2,284");
 });
});
