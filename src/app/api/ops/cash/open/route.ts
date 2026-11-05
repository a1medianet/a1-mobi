import { z } from "zod";
import { readAuthJson } from "@/core/auth/request";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { openCashSession } from "@/modules/cash/cash-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const amount = z.number().finite().min(0).max(1_000_000_000);
const payload = z.object({ openingUsd: amount, openingLbp: amount,
  openingExchangeRate: amount.positive(), confirmed: z.literal(true) }).strict();

export async function POST(request: Request) {
  if (process.env.A1_MOBI_C_LIVE_01_ENABLED !== "1") return authJson({ error: "NOT_FOUND" }, 404);
  if (!sameOriginMutation(request)) return authJson({ error: "FORBIDDEN_ORIGIN" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return authJson({ error: "INVALID_REQUEST" }, 400);
  try {
    const context = await currentStoreContext("cash.manage");
    const input = payload.safeParse(await readAuthJson(request, 4096));
    if (!input.success) return authJson({ error: "INVALID_REQUEST" }, 400);
    const session = await openCashSession({ tenantId: context.tenantId, branchId: context.branchId,
      actorId: context.actorId, openingUsd: input.data.openingUsd, openingLbp: input.data.openingLbp,
      openingExchangeRate: input.data.openingExchangeRate });
    return authJson({ status: session.status, cashSessionId: session.id });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "AUTH_REQUIRED") return authJson({ error: code }, 401);
    if (code === "PERMISSION_DENIED") return authJson({ error: code }, 403);
    if (code === "Branch already has an open cash session") return authJson({ error: "CASH_ALREADY_OPEN" }, 409);
    return authJson({ error: "CASH_OPEN_REJECTED" }, 400);
  }
}
