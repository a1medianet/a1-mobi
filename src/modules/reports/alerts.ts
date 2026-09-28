import { db } from "@/server/db";

export type OperationalAlert = {
  severity: "info" | "warning" | "critical";
  domain: "inventory" | "repair" | "debt" | "cash" | "topup";
  code: string;
  entityId: string;
  message: string;
};

export async function collectOperationalAlerts(tenantId: string, now = new Date()): Promise<OperationalAlert[]> {
  const lateThreshold = new Date(now.getTime() - 3 * 86_400_000);
  const [products, movements, repairs, debts, cashVariances, providers] = await Promise.all([
    db.product.findMany({ where: { tenantId, isActive: true } }),
    db.stockMovement.findMany({ where: { tenantId } }),
    db.repairOrder.findMany({
      where: {
        tenantId,
        status: { in: ["INTAKE", "DIAGNOSIS", "ESTIMATE_PENDING", "APPROVED", "IN_PROGRESS"] },
        intakeAt: { lt: lateThreshold },
      },
    }),
    db.debtAccount.findMany({ where: { tenantId, balance: { gt: 0 } } }),
    db.cashSession.findMany({ where: { tenantId, status: "CLOSED", varianceBase: { not: 0 } } }),
    db.topUpProvider.findMany({ where: { tenantId, payableBalance: { gt: 0 } } }),
  ]);
  const lowStock = products.filter((product) => {
    const balance = movements.filter((movement) => movement.productId === product.id)
      .reduce((sum, movement) => sum
        + (movement.toLocationId ? Number(movement.quantity) : 0)
        - (movement.fromLocationId ? Number(movement.quantity) : 0), 0);
    return balance <= Number(product.lowStockLevel);
  });
  return [
    ...lowStock.map((product): OperationalAlert => ({
      severity: "warning", domain: "inventory", code: "LOW_STOCK",
      entityId: product.id, message: `Low stock: ${product.sku}`,
    })),
    ...repairs.map((repair): OperationalAlert => ({
      severity: "warning", domain: "repair", code: "LATE_REPAIR",
      entityId: repair.id, message: `Repair ${repair.number} is late`,
    })),
    ...debts.map((account): OperationalAlert => ({
      severity: "warning", domain: "debt", code: "OPEN_DEBT",
      entityId: account.id, message: `Outstanding debt: ${account.balance}`,
    })),
    ...cashVariances.map((session): OperationalAlert => ({
      severity: "critical", domain: "cash", code: "CASH_VARIANCE",
      entityId: session.id, message: `Cash variance: ${session.varianceBase}`,
    })),
    ...providers.map((provider): OperationalAlert => ({
      severity: "info", domain: "topup", code: "PROVIDER_PAYABLE",
      entityId: provider.id, message: `Provider payable: ${provider.payableBalance}`,
    })),
  ];
}
