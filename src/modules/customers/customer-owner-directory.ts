import "server-only";
import { db } from "@/server/db";

// Customer profiles are tenant-wide identities. The branch directory deliberately
// lists only profiles registered at this branch; a cross-branch debt balance is
// NOT represented as a local receivable.
export async function getBranchCustomerDirectory(scope: { tenantId: string; branchId: string }) {
  if (!scope.tenantId || !scope.branchId) throw new Error("CUSTOMER_SCOPE_REQUIRED");
  const where = { tenantId: scope.tenantId, createdBranchId: scope.branchId };
  const [total, records] = await Promise.all([
    db.customer.count({ where }),
    db.customer.findMany({
      where, select: { id: true, name: true, phone: true, createdAt: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 75,
    }),
  ]);
  return {
    total,
    shown: records.length,
    customers: records.map(row => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      registeredAt: row.createdAt.toISOString(),
    })),
  };
}
