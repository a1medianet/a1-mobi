import "server-only";
import { db } from "@/server/db";

// Read-only branch snapshot. Never infer balances from demo data or a bounded list.
// The actual drawer opening/closing and payments remain in the existing cash services.
export async function getBranchCashSnapshot(scope: { tenantId: string; branchId: string }) {
  if (!scope.tenantId || !scope.branchId) throw new Error("CASH_SCOPE_REQUIRED");
  const where = { tenantId: scope.tenantId, branchId: scope.branchId };
  const session = await db.cashSession.findFirst({
    where: { ...where, status: "OPEN" },
    orderBy: [{ openedAt: "desc" }, { id: "desc" }],
  }) ?? await db.cashSession.findFirst({
    where,
    orderBy: [{ openedAt: "desc" }, { id: "desc" }],
  });
  if (!session) return { status: "NONE" as const, openedAt: null, closedAt: null,
    expectedUsd: null, expectedLbp: null, varianceBase: null, movements: [] };

  const movementWhere = { ...where, cashSessionId: session.id };
  const [totals, recent] = await Promise.all([
    db.cashMovement.groupBy({
      by: ["currency", "direction"],
      where: movementWhere,
      _sum: { amount: true },
    }),
    db.cashMovement.findMany({
      where: movementWhere,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: 30,
      select: { id: true, type: true, direction: true, currency: true, amount: true, occurredAt: true },
    }),
  ]);
  const signed = (currency: string) => totals
    .filter(row => row.currency === currency)
    .reduce((sum, row) => sum + (row.direction === "IN" ? 1 : -1) * Number(row._sum.amount ?? 0), 0);
  const round4 = (value: number) => Math.round((value + Number.EPSILON) * 10_000) / 10_000;
  return {
    status: session.status,
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt?.toISOString() ?? null,
    expectedUsd: round4(Number(session.openingUsd) + signed("USD")),
    expectedLbp: round4(Number(session.openingLbp) + signed("LBP")),
    varianceBase: session.status === "CLOSED" ? Number(session.varianceBase ?? 0) : null,
    movements: recent.map(m => ({
      id: m.id, type: m.type, direction: m.direction, currency: m.currency,
      amount: Number(m.amount), occurredAt: m.occurredAt.toISOString(),
    })),
  };
}
