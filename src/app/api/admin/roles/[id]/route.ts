import { z } from "zod";
import { PERMISSIONS } from "@/core/rbac/permissions";
import { readAuthJson } from "@/core/auth/request";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { controlError } from "@/server/control-http";
import { updateTenantRole } from "@/server/foundation-control";

export const runtime = "nodejs";
const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  permissions: z.array(z.string()).max(PERMISSIONS.length).optional(),
}).strict().refine(value => Object.keys(value).length > 0);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOriginMutation(request)) return authJson({ error: "FORBIDDEN_ORIGIN" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return authJson({ error: "INVALID_REQUEST" }, 400);
  }
  let input;
  try { input = updateSchema.safeParse(await readAuthJson(request, 16_384)); }
  catch { return authJson({ error: "INVALID_REQUEST" }, 400); }
  if (!input.success) return authJson({ error: "INVALID_REQUEST" }, 400);
  try {
    const context = await currentStoreContext("roles.manage");
    const { id } = await params;
    return authJson({ role: await updateTenantRole(context, id, input.data) });
  } catch (error) { return controlError(error); }
}
