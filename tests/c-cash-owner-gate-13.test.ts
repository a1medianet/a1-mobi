import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({
  db: {
    cashSession: { findFirst: vi.fn() },
    cashMovement: { groupBy: vi.fn(), findMany: vi.fn() },
  },
}));
vi.mock("@/server/auth-http", () => ({
  currentStoreContext: vi.fn(),
}));
const { db } = await import("@/server/db");
const { currentStoreContext } = await import("@/server/auth-http");
const { getBranchCashSnapshot } = await import("@/modules/cash/cash-owner-snapshot");
const { default: CashOwnerLivePage } = await import("@/components/cash-owner-live");
const { default: CashPage } = await import("@/app/[locale]/cash/page");

const scope = { tenantId: "tenant-A", branchId: "branch-1" };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(currentStoreContext).mockResolvedValue({
    ...scope, actorId: "actor-A", permissions: new Set(["cash.manage"]),
  } as never);
});

describe("C-13 cash owner read-only UAT gate", () => {
  it("uses actual branch-scoped movements with full aggregates, not the last 30 rows", async () => {
    vi.mocked(db.cashSession.findFirst).mockResolvedValueOnce({
      id: "drawer-1", status: "OPEN", openingUsd: 100,
      openingLbp: 200000, openingExchangeRate: 89000, varianceBase: null,
      openedAt: new Date("2026-10-18T12:00:00Z"), closedAt: null,
    } as never);
    vi.mocked(db.cashMovement.groupBy).mockResolvedValue([
      { currency: "USD", direction: "IN", _sum: { amount: 75 } },
      { currency: "USD", direction: "OUT", _sum: { amount: 20 } },
      { currency: "LBP", direction: "OUT", _sum: { amount: 45000 } },
    ] as never);
    vi.mocked(db.cashMovement.findMany).mockResolvedValue([{
      id: "movement-1", type: "SALE", direction: "IN", currency: "USD",
      amount: 75, occurredAt: new Date("2026-10-18T13:00:00Z"),
    }] as never);
    const value = await getBranchCashSnapshot(scope);
    expect(value).toMatchObject({ status: "OPEN", expectedUsd: 155, expectedLbp: 155000, varianceBase: null });
    expect(value.movements).toHaveLength(1);
    expect(db.cashSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { ...scope, status: "OPEN" },
    }));
    expect(db.cashMovement.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: { ...scope, cashSessionId: "drawer-1" },
      _sum: { amount: true },
    }));
    expect(db.cashMovement.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { ...scope, cashSessionId: "drawer-1" },
      take: 30,
    }));
  });

  it("shows actual empty state without inventing sample cash totals", async () => {
    vi.mocked(db.cashSession.findFirst).mockResolvedValue(null);
    const value = await getBranchCashSnapshot(scope);
    expect(value).toEqual({ status: "NONE", sessionId: null, openingExchangeRate: null,
      openedAt: null, closedAt: null, expectedUsd: null, expectedLbp: null,
      varianceBase: null, movements: [] });
    expect(db.cashSession.findFirst).toHaveBeenCalledTimes(2);
    expect(db.cashMovement.findMany).not.toHaveBeenCalled();
  });

  it("displays recorded closed variance without treating an open session as closed", async () => {
    vi.mocked(db.cashSession.findFirst).mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: "drawer-2", status: "CLOSED", openingUsd: 10, openingLbp: 0,
      varianceBase: -5, openedAt: new Date("2026-10-18T12:00:00Z"),
      closedAt: new Date("2026-10-18T14:00:00Z"),
    } as never);
    vi.mocked(db.cashMovement.groupBy).mockResolvedValue([] as never);
    vi.mocked(db.cashMovement.findMany).mockResolvedValue([] as never);
    const value = await getBranchCashSnapshot(scope);
    expect(value.status).toBe("CLOSED");
    expect(value.varianceBase).toBe(-5);
    expect(value.expectedUsd).toBe(10);
  });

  it("requires cash permission before reading tenant/branch data", async () => {
    vi.mocked(currentStoreContext).mockRejectedValue(new Error("PERMISSION_DENIED"));
    const rendered = await CashOwnerLivePage({ locale: "ar" });
    expect(rendered.props.children.props.children).toContain("ليس لديك إذن");
    expect(db.cashSession.findFirst).not.toHaveBeenCalled();
    expect(currentStoreContext).toHaveBeenCalledWith("cash.manage");
  });

  it("keeps the prior pilot demo when the operational feature gate is OFF", async () => {
    const before = process.env.A1_MOBI_C_LIVE_01_ENABLED;
    try {
      process.env.A1_MOBI_C_LIVE_01_ENABLED = "0";
      const page = await CashPage({ params: Promise.resolve({ locale: "ar" }) });
      expect(page.type).toBe("main");
      process.env.A1_MOBI_C_LIVE_01_ENABLED = "1";
      const live = await CashPage({ params: Promise.resolve({ locale: "ar" }) });
      expect(live.type).toBe(CashOwnerLivePage);
    } finally {
      if (before === undefined) delete process.env.A1_MOBI_C_LIVE_01_ENABLED;
      else process.env.A1_MOBI_C_LIVE_01_ENABLED = before;
    }
  });
});
