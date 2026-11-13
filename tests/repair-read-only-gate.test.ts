import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  ctx: vi.fn(), find: vi.fn(), count: vi.fn(), group: vi.fn(), cash: vi.fn(),
}));
vi.mock("@/server/db", () => ({ db: {
  repairOrder: { findMany: m.find, count: m.count, groupBy: m.group },
  cashSession: { findFirst: m.cash },
} }));
vi.mock("@/server/auth-http", () => ({
  currentStoreContext: m.ctx,
  authJson: (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { "Cache-Control":"no-store" } }),
  sameOriginMutation: () => true,
}));
import { GET, POST } from "@/app/api/ops/live-02/route";

const url = "https://mobi.a1medianet.com/api/ops/live-02";
afterEach(() => vi.unstubAllEnvs());
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("A1_MOBI_C_LIVE_02_ENABLED", "0");
  m.ctx.mockResolvedValue({ tenantId:"t-safe", branchId:"b-safe", actorId:"owner" });
  m.find.mockResolvedValue([]);
  m.count.mockResolvedValue(0);
  m.group.mockResolvedValue([]);
  m.cash.mockResolvedValue(null);
});
describe("repair read-only safety when write feature gate is closed", () => {
  it("reads only permitted tenant and branch without enabling writes", async () => {
    const response = await GET(new Request(url+"?status=ALL"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      orders:[], cashOpen:false, matchedCount:0,
      overview:{ total:0, active:0, ready:0, balanceDue:0 },
    });
    expect(m.ctx).toHaveBeenCalledWith("repair.manage");
    expect(m.find).toHaveBeenCalledWith(expect.objectContaining({
      where:{ tenantId:"t-safe", branchId:"b-safe" },
    }));
    expect(m.group).toHaveBeenCalledWith(expect.objectContaining({
      where:{tenantId:"t-safe", branchId:"b-safe"},
    }));
  });
  it("never allows a repair mutation while the live-write gate is disabled", async () => {
    const response = await POST(new Request(url,{
      method:"POST",headers:{"Content-Type":"application/json","Origin":"https://mobi.a1medianet.com"},
      body:JSON.stringify({action:"approve",repairId:"repair-example"}),
    }));
    expect(response.status).toBe(404);
    expect(m.ctx).not.toHaveBeenCalled();
  });
  it("requires authentication for read access", async () => {
    m.ctx.mockRejectedValueOnce(new Error("AUTH_REQUIRED"));
    const response=await GET(new Request(url));
    expect(response.status).toBe(401);
    expect(m.find).not.toHaveBeenCalled();
  });
  it("does not read across a branch even with a user-supplied filter", async () => {
    const response=await GET(new Request(url+"?q=repair&status=READY"));
    expect(response.status).toBe(200);
    expect(m.find).toHaveBeenCalledWith(expect.objectContaining({
      where:expect.objectContaining({
        tenantId:"t-safe",branchId:"b-safe",status:"READY",
      }),
    }));
    const invalid=await GET(new Request(url+"?status=FOREIGN"));
    expect(invalid.status).toBe(400);
  });
});
