import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({ db: { cashSession: { findFirst: vi.fn() } } }));
vi.mock("@/modules/cash/cash-service", () => ({ closeCashSession: vi.fn() }));
vi.mock("@/server/auth-http", () => ({
  sameOriginMutation: vi.fn().mockReturnValue(true),
  currentStoreContext: vi.fn(),
  authJson: (body: unknown, status = 200) => Response.json(body, { status }),
}));
const { db } = await import("@/server/db");
const { closeCashSession } = await import("@/modules/cash/cash-service");
const { sameOriginMutation, currentStoreContext } = await import("@/server/auth-http");
const { POST } = await import("@/app/api/ops/cash/close/route");

const scope = { tenantId: "tenant-a", branchId: "branch-a", actorId: "user-a",
  permissions: new Set(["cash.manage"]) };
const sampleSession = { id: "cash-session-1", tenantId: scope.tenantId,
  branchId: scope.branchId, status: "OPEN", openingUsd: 100,
  openingLbp: 8950000, openingExchangeRate: 89500,
  movements: [{ direction: "IN", baseAmount: 50 }, { direction: "OUT", baseAmount: 20 }] };
const valid = { cashSessionId: sampleSession.id, physicalUsd: 130, physicalLbp: 8950000,
  closingExchangeRate: 89500 };
const make = (data: unknown, origin = "http://127.0.0.1:3198") => new Request(
  "http://127.0.0.1:3198/api/ops/cash/close",
  { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(data) },
);
beforeEach(() => {
  vi.resetAllMocks();
  process.env.A1_MOBI_C_LIVE_01_ENABLED = "1";
  vi.mocked(currentStoreContext).mockResolvedValue(scope as never);
  vi.mocked(sameOriginMutation).mockReturnValue(true);
  vi.mocked(db.cashSession.findFirst).mockResolvedValue(sampleSession as never);
  vi.mocked(closeCashSession).mockResolvedValue({ id: sampleSession.id, status: "CLOSED",
    expectedBase: 230, physicalBase: 230, varianceBase: 0 } as never);
});
describe("C-14/01 cash close endpoint — authenticated, scoped, no fake success", () => {
  it("computes an accurate read-only dual-currency preview without closing the ledger", async () => {
    const result = await POST(make({ action: "preview", ...valid }));
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ expectedBase: 230, physicalBase: 230,
      varianceBase: 0, requiresApproval: false, status: "PREVIEW_ONLY" });
    expect(db.cashSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: scope.tenantId, branchId: scope.branchId,
        id: sampleSession.id, status: "OPEN" }) }));
    expect(closeCashSession).not.toHaveBeenCalled();
    const diff = await POST(make({ action: "preview", ...valid, physicalUsd: 129 }));
    expect((await diff.json()).requiresApproval).toBe(true);
  });
  it("requires explicit confirmation before any real close", async () => {
    expect((await POST(make({ action: "close", ...valid }))).status).toBe(400);
    expect(closeCashSession).not.toHaveBeenCalled();
    const closed = await POST(make({ action: "close", ...valid, confirmed: true }));
    expect(closed.status).toBe(200);
    expect(await closed.json()).toMatchObject({ status: "CLOSED", varianceBase: 0 });
    expect(closeCashSession).toHaveBeenCalledWith(expect.objectContaining({
      ...valid, tenantId: scope.tenantId, branchId: scope.branchId, actorId: scope.actorId,
    }));
  });
  it("rejects missing permission, unauthenticated, cross origin and disabled gate", async () => {
    vi.mocked(currentStoreContext).mockRejectedValueOnce(new Error("PERMISSION_DENIED"));
    expect((await POST(make({ action: "preview", ...valid }))).status).toBe(403);
    vi.mocked(currentStoreContext).mockRejectedValueOnce(new Error("AUTH_REQUIRED"));
    expect((await POST(make({ action: "preview", ...valid }))).status).toBe(401);
    vi.mocked(sameOriginMutation).mockReturnValueOnce(false);
    expect((await POST(make({ action: "close", ...valid, confirmed: true }))).status).toBe(403);
    process.env.A1_MOBI_C_LIVE_01_ENABLED = "0";
    expect((await POST(make({ action: "close", ...valid, confirmed: true }))).status).toBe(404);
    expect(closeCashSession).not.toHaveBeenCalled();
  });
  it("refuses another tenant's or closed session without touching ledger", async () => {
    vi.mocked(db.cashSession.findFirst).mockResolvedValue(null);
    expect((await POST(make({ action: "close", ...valid, confirmed: true }))).status).toBe(409);
    expect(closeCashSession).not.toHaveBeenCalled();
  });
  it("enforces strict finite money, no extra fields, and disallows self approval", async () => {
    expect((await POST(make({ action: "preview", ...valid, physicalUsd: -2 }))).status).toBe(400);
    expect((await POST(make({ action: "preview", ...valid, unexpected: true }))).status).toBe(400);
    expect((await POST(make({ action: "close", ...valid, confirmed: true,
      approverId: scope.actorId, varianceReason: "cash discrepancy" }))).status).toBe(409);
    expect(closeCashSession).not.toHaveBeenCalled();
  });
  it("blocks forged second-manager approval until independent authentication is implemented", async () => {
    const forged = await POST(make({ action: "close", ...valid, physicalUsd: 129,
      confirmed: true, varianceReason: "Synthetic discrepancy",
      approverId: "other-manager-123" }));
    expect(forged.status).toBe(409);
    expect((await forged.json()).error).toBe("INDEPENDENT_APPROVAL_REQUIRED");
    expect(closeCashSession).not.toHaveBeenCalled();
  });  it("never pretends variance approval or double close succeeded", async () => {
    vi.mocked(closeCashSession).mockRejectedValueOnce(
      new Error("Cash variance requires reason and approver"));
    const noApproval = await POST(make({ action: "close", ...valid, physicalUsd: 129,
      confirmed: true }));
    expect(noApproval.status).toBe(409);
    expect((await noApproval.json()).error).toBe("VARIANCE_APPROVAL_REQUIRED");
    vi.mocked(closeCashSession).mockRejectedValueOnce(
      new Error("Matching open cash session is required"));
    expect((await POST(make({ action: "close", ...valid, confirmed: true }))).status).toBe(409);
  });
});
