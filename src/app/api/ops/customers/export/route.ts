import { authJson, currentStoreContext } from "@/server/auth-http";
import { db } from "@/server/db";
import { toExcelCsv } from "@/modules/engagement/safe-csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Branch-scoped, audited customer export; never exports marketing consent by inference. */
export async function GET() {
  try {
    const ctx = await currentStoreContext("foundation.manage");
    const rows = await db.customer.findMany({
      where: { tenantId: ctx.tenantId, createdBranchId: ctx.branchId },
      select: { id: true, name: true, phone: true, email: true, createdAt: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5000,
    });
    const csv = toExcelCsv([
      ["Customer ID", "Name", "Phone", "Email", "Registered (UTC)"],
      ...rows.map(row => [row.id, row.name, row.phone, row.email ?? "", row.createdAt.toISOString()]),
    ]);
    await db.auditEvent.create({
      data: { tenantId: ctx.tenantId, branchId: ctx.branchId, actorId: ctx.actorId,
        action: "customers.exported", entityType: "Customer", entityId: ctx.branchId,
        after: { count: rows.length, format: "csv", limit: 5000 } },
    });
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="mobi-customers.csv"',
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "AUTH_REQUIRED") return authJson({ error: code }, 401);
    if (code === "PERMISSION_DENIED") return authJson({ error: code }, 403);
    return authJson({ error: "CUSTOMER_EXPORT_FAILED" }, 503);
  }
}
