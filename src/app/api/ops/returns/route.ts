import { Prisma } from "@prisma/client";
import { z } from "zod";
import { readAuthJson } from "@/core/auth/request";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { controlError } from "@/server/control-http";
import { db } from "@/server/db";
import { postSaleReturn } from "@/modules/sell/return-service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const id = z.string().trim().min(1).max(100);
const schema = z.object({ saleId: id, invoiceNumber: id, reason: z.string().trim().min(1).max(500), idempotencyKey: z.string().uuid(),
  lines: z.array(z.object({ originalSaleLineId: id, stockLocationId: id, quantity: z.number().int().positive().max(10000) }).strict()).min(1).max(50)
}).strict();
export async function GET(request: Request) {
  if (process.env.A1_MOBI_C_LIVE_01_ENABLED !== "1") return authJson({ error: "NOT_FOUND" }, 404);
  try {
    const ctx = await currentStoreContext("sell.return");
    const invoiceNumber = id.safeParse(new URL(request.url).searchParams.get("invoice"));
    if (!invoiceNumber.success) return authJson({ error: "INVALID_REQUEST" }, 400);
    const sale = await db.sale.findFirst({ where: { tenantId: ctx.tenantId, branchId: ctx.branchId, invoice: { number: invoiceNumber.data, status: "ISSUED" }, status: { in: ["COMPLETED", "PARTIALLY_RETURNED", "RETURNED"] } },
      include: { invoice: true, lines: { include: { product: true, returnLines: { where: { saleReturn: { status: "POSTED" } } } } } } });
    if (!sale) return authJson({ error: "NOT_FOUND" }, 404);
    const locations = await db.stockLocation.findMany({ where: { tenantId: ctx.tenantId, branchId: ctx.branchId }, select: { id: true, name: true } });
    return authJson({ saleId: sale.id, invoiceNumber: sale.invoice!.number, locations,
      lines: sale.lines.filter(line => !line.serializedDeviceId && !line.product.isSerialized).map(line => ({ id: line.id, nameAr: line.product.nameAr, nameEn: line.product.nameEn,
        unitPrice: Number(line.finalUnitPrice), remaining: Number(line.quantity) - line.returnLines.reduce((sum, row) => sum + Number(row.quantity), 0) })) });
  } catch (error) { return controlError(error); }
}
export async function POST(request: Request) {
  if (process.env.A1_MOBI_C_LIVE_01_ENABLED !== "1") return authJson({ error: "NOT_FOUND" }, 404);
  if (!sameOriginMutation(request)) return authJson({ error: "FORBIDDEN_ORIGIN" }, 403);
  try {
    const ctx = await currentStoreContext("sell.return");
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return authJson({ error: "INVALID_REQUEST" }, 400);
    let input;
    try { input = schema.safeParse(await readAuthJson(request, 16384)); } catch { return authJson({ error: "INVALID_REQUEST" }, 400); }
    if (!input.success || new Set(input.data.lines.map(line => line.originalSaleLineId)).size !== input.data.lines.length) return authJson({ error: "INVALID_REQUEST" }, 400);
    const result = await postSaleReturn({ ...input.data, tenantId: ctx.tenantId, branchId: ctx.branchId, actorId: ctx.actorId,
      number: "R-" + input.data.idempotencyKey.replaceAll("-", "").toUpperCase(), nonserializedOnly: true });
    return authJson({ id: result.id, number: result.number, refundBase: Number(result.refundBase), status: result.status });
  } catch (error) {
    if (error instanceof Error && ["AUTH_REQUIRED", "PERMISSION_DENIED"].includes(error.message)) return controlError(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) return authJson({ error: "RETRY_SAME_REQUEST" }, 409);
    if (error instanceof Error && error.message === "RETURN_IDEMPOTENCY_CONFLICT") return authJson({ error: error.message }, 409);
    return authJson({ error: "RETURN_REJECTED" }, 400);
  }
}
