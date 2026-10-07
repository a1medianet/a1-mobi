import { authJson, currentStoreContext } from "@/server/auth-http";
export const runtime = "nodejs";
export async function GET() {
  try {
    const context = await currentStoreContext();
    if (!context) return authJson({ error: "AUTH_REQUIRED" }, 401);
    return authJson({ actorId: context.actorId, tenantId: context.tenantId,
      branchId: context.branchId, permissions: [...context.permissions].sort() });
  } catch { return authJson({ error: "SERVICE_UNAVAILABLE" }, 503); }
}
