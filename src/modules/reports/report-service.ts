import { db } from "@/server/db";

const number = (value: unknown) => Number(value ?? 0);
const round = (value: number) => Math.round((value + Number.EPSILON) * 10_000) / 10_000;

export async function buildOwnerSummary(input: {
  tenantId: string;
  from: Date;
  to: Date;
}) {
  const range = { gte: input.from, lt: input.to };
  const [sales, repairs, topups, debtAccounts, debtCollections, closedCash, products, movements, sensitiveActions] = await Promise.all([
    db.sale.findMany({
      where: { tenantId: input.tenantId, occurredAt: range, status: { not: "VOIDED" } },
      include: { lines: true },
    }),
    db.repairOrder.findMany({
      where: { tenantId: input.tenantId, deliveredAt: range },
      include: { parts: true },
    }),
    db.topUpTransaction.findMany({
      where: { tenantId: input.tenantId, occurredAt: range, status: "POSTED" },
    }),
    db.debtAccount.findMany({ where: { tenantId: input.tenantId } }),
    db.debtEntry.aggregate({
      where: { tenantId: input.tenantId, occurredAt: range, kind: "PAYMENT" },
      _sum: { amount: true },
    }),
    db.cashSession.findMany({
      where: { tenantId: input.tenantId, closedAt: range, status: "CLOSED" },
    }),
    db.product.findMany({ where: { tenantId: input.tenantId, isActive: true } }),
    db.stockMovement.findMany({ where: { tenantId: input.tenantId } }),
    db.auditEvent.findMany({
      where: { tenantId: input.tenantId, occurredAt: range },
      orderBy: { occurredAt: "desc" },
      take: 100,
    }),
  ]);

  const salesRevenue = round(sales.reduce((sum, sale) => sum + number(sale.total), 0));
  const salesCost = round(sales.flatMap((sale) => sale.lines)
    .reduce((sum, line) => sum + number(line.unitCost) * number(line.quantity), 0));
  const repairRevenue = round(repairs.reduce((sum, repair) => sum + number(repair.finalPrice), 0));
  const repairCost = round(repairs.reduce(
    (sum, repair) => sum + number(repair.partsCost) + number(repair.laborCost) + number(repair.directCost),
    0,
  ));
  const topUpVolume = round(topups.reduce((sum, topup) => sum + number(topup.saleBase), 0));
  const topUpCost = round(topups.reduce((sum, topup) => sum + number(topup.costBase), 0));
  const debtBalance = round(debtAccounts.reduce((sum, account) => sum + number(account.balance), 0));
  const cashVariance = round(closedCash.reduce((sum, session) => sum + number(session.varianceBase), 0));

  const stock = products.map((product) => {
    const balance = movements
      .filter((movement) => movement.productId === product.id)
      .reduce((sum, movement) => sum
        + (movement.toLocationId ? number(movement.quantity) : 0)
        - (movement.fromLocationId ? number(movement.quantity) : 0), 0);
    return {
      productId: product.id,
      sku: product.sku,
      balance: round(balance),
      value: round(balance * number(product.costAmount)),
      low: balance <= number(product.lowStockLevel),
    };
  });

  return {
    period: { from: input.from.toISOString(), to: input.to.toISOString() },
    sales: { revenue: salesRevenue, cost: salesCost, margin: round(salesRevenue - salesCost), count: sales.length },
    repairs: { revenue: repairRevenue, cost: repairCost, profit: round(repairRevenue - repairCost), count: repairs.length },
    topup: { volume: topUpVolume, cost: topUpCost, profit: round(topUpVolume - topUpCost), count: topups.length },
    debt: { balance: debtBalance, collections: number(debtCollections._sum.amount) },
    cash: { variance: cashVariance, sessionsClosed: closedCash.length },
    sensitiveActions: { count: sensitiveActions.length, items: sensitiveActions },
    stock: {
      valuation: round(stock.reduce((sum, item) => sum + item.value, 0)),
      lowItems: stock.filter((item) => item.low),
    },
  };
}
