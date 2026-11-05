import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({
  db: { customer: { count: vi.fn(), findMany: vi.fn() } },
}));
vi.mock("@/server/auth-http", () => ({ currentStoreContext: vi.fn() }));
const { db } = await import("@/server/db");
const { currentStoreContext } = await import("@/server/auth-http");
const { getBranchCustomerDirectory } = await import("@/modules/customers/customer-owner-directory");
const { default: CustomerOwnerDirectory } = await import("@/components/customer-owner-directory");
const { default: CustomersPage } = await import("@/app/[locale]/customers/page");

const scope={tenantId:"tenant-A",branchId:"branch-1"};
beforeEach(()=>{
  vi.clearAllMocks();
  vi.mocked(currentStoreContext).mockResolvedValue({ ...scope, actorId:"owner",
    permissions:new Set(["customers.read"]) } as never);
});

describe("C-13 owner customer directory gate",()=>{
  it("queries only matching tenant and registration branch with server pagination limit",async ()=>{
    vi.mocked(db.customer.count).mockResolvedValue(91);
    vi.mocked(db.customer.findMany).mockResolvedValue([
      {id:"one",name:"Test customer",phone:"+96170000000",createdAt:new Date("2026-10-18T00:00:00Z")}
    ] as never);
    const value=await getBranchCustomerDirectory(scope);
    expect(value.total).toBe(91);
    expect(value.shown).toBe(1);
    expect(value.customers[0]).toEqual({id:"one",name:"Test customer",phone:"+96170000000",
      registeredAt:"2026-10-18T00:00:00.000Z"});
    expect(db.customer.count).toHaveBeenCalledWith({where:{tenantId:scope.tenantId,createdBranchId:scope.branchId}});
    expect(db.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where:{tenantId:scope.tenantId,createdBranchId:scope.branchId},
      take:75,select:{id:true,name:true,phone:true,createdAt:true},
    }));
  });

  it("renders a true empty-state without synthetic customer or debt totals",async ()=>{
    vi.mocked(db.customer.count).mockResolvedValue(0);
    vi.mocked(db.customer.findMany).mockResolvedValue([] as never);
    const value=await getBranchCustomerDirectory(scope);
    expect(value).toEqual({total:0,shown:0,customers:[]});
  });

  it("requires a scoped branch and tenant",async ()=>{
    await expect(getBranchCustomerDirectory({tenantId:"",branchId:"x"})).rejects.toThrow("CUSTOMER_SCOPE_REQUIRED");
    await expect(getBranchCustomerDirectory({tenantId:"x",branchId:""})).rejects.toThrow("CUSTOMER_SCOPE_REQUIRED");
    expect(db.customer.count).not.toHaveBeenCalled();
  });

  it("denies customer data before any DB access without the read permission",async ()=>{
    vi.mocked(currentStoreContext).mockRejectedValue(new Error("PERMISSION_DENIED"));
    const html=await CustomerOwnerDirectory({locale:"en"});
    expect(html.props.children.props.children).toContain("permission");
    expect(currentStoreContext).toHaveBeenCalledWith("customers.read");
    expect(db.customer.findMany).not.toHaveBeenCalled();
  });

  it("leaves original demo route untouched when feature gate is off",async ()=>{
    const before=process.env.A1_MOBI_C_LIVE_01_ENABLED;
    try{
      process.env.A1_MOBI_C_LIVE_01_ENABLED="0";
      expect((await CustomersPage({params:Promise.resolve({locale:"ar"})})).type).toBe("main");
      process.env.A1_MOBI_C_LIVE_01_ENABLED="1";
      expect((await CustomersPage({params:Promise.resolve({locale:"ar"})})).type).toBe(CustomerOwnerDirectory);
    } finally {
      if(before===undefined)delete process.env.A1_MOBI_C_LIVE_01_ENABLED;
      else process.env.A1_MOBI_C_LIVE_01_ENABLED=before;
    }
  });
});
