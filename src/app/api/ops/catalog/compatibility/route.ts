import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { controlError } from "@/server/control-http";
import { readAuthJson } from "@/core/auth/request";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";
const command = z.discriminatedUnion("action", [
  z.object({ action: z.literal("link"), productId: z.string().min(2).max(90), deviceVariantId: z.string().min(2).max(90), notes: z.string().trim().max(500).optional() }).strict(),
  z.object({ action: z.literal("unlink"), productId: z.string().min(2).max(90), deviceVariantId: z.string().min(2).max(90) }).strict(),
]);
export async function GET(request: Request) {
  try {
    const ctx = await currentStoreContext("inventory.read");
    const productId = new URL(request.url).searchParams.get("productId");
    if (!productId || productId.length > 90) return authJson({ error: "INVALID_REQUEST" }, 400);
    const product = await db.product.findFirst({ where: { id: productId, tenantId: ctx.tenantId, type: "PART" }, select: { id: true } });
    if (!product) return authJson({ error: "NOT_FOUND" }, 404);
    const items = await db.productCompatibility.findMany({
      where: { productId, deviceVariant: { tenantId: ctx.tenantId } },
      select: { deviceVariantId: true, source: true, notes: true, deviceVariant: { select: { name: true, model: { select: { name: true } } } } },
      orderBy: { deviceVariantId: "asc" },
    });
    return authJson({ compatibilities: items });
  } catch (error) { return controlError(error); }
}
export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authJson({ error: "FORBIDDEN_ORIGIN" }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return authJson({ error: "INVALID_REQUEST" }, 400);
  try {
    const ctx = await currentStoreContext("foundation.manage");
    let body: unknown;
    try { body = await readAuthJson(request, 4096); } catch { return authJson({ error: "INVALID_REQUEST" }, 400); }
    const parsed = command.safeParse(body);
    if (!parsed.success) return authJson({ error: "INVALID_REQUEST" }, 400);
    const input = parsed.data;
    const result = await db.$transaction(async (tx) => {
      const [product, variant] = await Promise.all([
        tx.product.findFirst({ where: { id: input.productId, tenantId: ctx.tenantId, type: "PART" }, select: { id: true } }),
        tx.deviceVariant.findFirst({ where: { id: input.deviceVariantId, tenantId: ctx.tenantId }, select: { id: true } }),
      ]);
      if (!product || !variant) return "NOT_FOUND" as const;
      const key = { productId_deviceVariantId: { productId: product.id, deviceVariantId: variant.id } };
      const existing = await tx.productCompatibility.findUnique({ where: key });
      if (input.action === "link") {
        if (existing) return "ALREADY_LINKED" as const;
        await tx.productCompatibility.create({ data: { productId: product.id, deviceVariantId: variant.id, source: "manual", ...(input.notes ? { notes: input.notes } : {}) } });
      } else {
        if (!existing) return "NOT_LINKED" as const;
        await tx.productCompatibility.delete({ where: key });
      }
      await tx.auditEvent.create({ data: {
        tenantId: ctx.tenantId, branchId: ctx.branchId, actorId: ctx.actorId,
        action: "catalog.compatibility." + input.action, entityType: "ProductCompatibility",
        entityId: product.id,
        before: existing ? { productId: product.id, deviceVariantId: variant.id, source: existing.source, notes: existing.notes } : Prisma.JsonNull,
        after: input.action === "link" ? { productId: product.id, deviceVariantId: variant.id, source: "manual", notes: input.notes ?? null } : Prisma.JsonNull,
      } });
      return "PASS" as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result === "NOT_FOUND") return authJson({ error: "NOT_FOUND" }, 404);
    if (result !== "PASS") return authJson({ error: result }, 409);
    return authJson({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return authJson({ error: "CONFLICT" }, 409);
    return controlError(error);
  }
}
