import { z } from "zod";
import { readAuthJson } from "@/core/auth/request";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { closeCashSession } from "@/modules/cash/cash-service";
import { db } from "@/server/db";
import { calculateExpectedCash, toBase } from "@/modules/cash/cash-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const amount = z.number().finite().min(0).max(1_000_000_000);
const payload = z.discriminatedUnion("action", [
  z.object({ action: z.literal("preview"), cashSessionId: z.string().min(5).max(90),
    physicalUsd: amount, physicalLbp: amount, closingExchangeRate: amount.positive() }).strict(),
  z.object({ action: z.literal("close"), cashSessionId: z.string().min(5).max(90),
    physicalUsd: amount, physicalLbp: amount, closingExchangeRate: amount.positive(),
    varianceReason: z.string().trim().min(5).max(400).optional(),
    approverId: z.string().min(5).max(90).optional(),
    confirmed: z.literal(true) }).strict(),
]);

const round = (n: number) => Math.round((n + Number.EPSILON) * 10000) / 10000;

export async function POST(request: Request) {
  if (process.env.A1_MOBI_C_LIVE_01_ENABLED !== "1")
    return authJson({ error: "NOT_FOUND" }, 404);
  if (!sameOriginMutation(request)) return authJson({ error: "FORBIDDEN_ORIGIN" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return authJson({ error: "INVALID_REQUEST" }, 400);
  let parsed: ReturnType<typeof payload.safeParse>;
  try { parsed = payload.safeParse(await readAuthJson(request, 4096)); }
  catch { return authJson({ error: "INVALID_REQUEST" }, 400); }
  if (!parsed.success) return authJson({ error: "INVALID_REQUEST" }, 400);

  try {
    const context = await currentStoreContext("cash.manage");
    const input = parsed.data;
    const session = await db.cashSession.findFirst({
      where: { id: input.cashSessionId, tenantId: context.tenantId,
        branchId: context.branchId, status: "OPEN" },
      include: { movements: { select: { direction: true, baseAmount: true } } },
    });
    if (!session) return authJson({ error: "CASH_SESSION_NOT_OPEN" }, 409);
    if (input.action === "preview") {
      const expectedBase = calculateExpectedCash({
        openingUsd: Number(session.openingUsd),
        openingLbp: Number(session.openingLbp),
        openingExchangeRate: Number(session.openingExchangeRate),
        movements: session.movements.map(m => ({
          direction: m.direction, baseAmount: Number(m.baseAmount),
        })),
      });
      const physicalBase = round(input.physicalUsd + toBase(input.physicalLbp, input.closingExchangeRate));
      const varianceBase = round(physicalBase - expectedBase);
      return authJson({ status: "PREVIEW_ONLY", cashSessionId: session.id,
        expectedBase, physicalBase, varianceBase,
        requiresApproval: Math.abs(varianceBase) > 0.0001 });
    }
    if (input.approverId && input.approverId === context.actorId)
      return authJson({ error: "SELF_APPROVAL_FORBIDDEN" }, 409);
    // C14 pilot safety: selecting another manager's ID is NOT authentication.
    // Never let a cashier claim independent variance approval via this API.
    // A separately authenticated approval flow is required before variance closes.
    if (input.approverId || input.varianceReason)
      return authJson({ error: "INDEPENDENT_APPROVAL_REQUIRED" }, 409);
    const closed = await closeCashSession({
      tenantId: context.tenantId, branchId: context.branchId, actorId: context.actorId,
      cashSessionId: session.id, physicalUsd: input.physicalUsd,
      physicalLbp: input.physicalLbp, closingExchangeRate: input.closingExchangeRate,
      varianceReason: input.varianceReason, approverId: input.approverId,
    });
    return authJson({ status: closed.status, cashSessionId: closed.id,
      expectedBase: Number(closed.expectedBase),
      physicalBase: Number(closed.physicalBase),
      varianceBase: Number(closed.varianceBase) });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "AUTH_REQUIRED") return authJson({ error: code }, 401);
    if (code === "PERMISSION_DENIED") return authJson({ error: code }, 403);
    if (code === "Cash variance requires reason and approver")
      return authJson({ error: "VARIANCE_APPROVAL_REQUIRED" }, 409);
    if (code === "APPROVER_NOT_AUTHORIZED" || code === "SELF_APPROVAL_FORBIDDEN")
      return authJson({ error: code }, 409);
    if (code === "Matching open cash session is required")
      return authJson({ error: "CASH_SESSION_NOT_OPEN" }, 409);
    if (code === "P2034") return authJson({ error: "CASH_CONFLICT_RETRY" }, 409);
    return authJson({ error: "CASH_CLOSE_REJECTED" }, 400);
  }
}
