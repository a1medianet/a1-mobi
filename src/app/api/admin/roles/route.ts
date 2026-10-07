import { z } from "zod";
import { PERMISSIONS } from "@/core/rbac/permissions";
import { readAuthJson } from "@/core/auth/request";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { controlError } from "@/server/control-http";
import { createTenantRole, listTenantRoles } from "@/server/foundation-control";

export const runtime = "nodejs";
const createSchema = z.object({
  code: z.string().trim().min(2).max(50).regex(/^[a-zA-Z0-9._-]+$/),
  name: z.string().trim().min(1).max(120),
  permissions: z.array(z.string()).max(PERMISSIONS.length).default([]),
}).strict();

export async function GET() {
  try {
    const context = await currentStoreContext("roles.manage");
    return authJson({ roles: await listTenantRoles(context), permissionRegistry: PERMISSIONS });
  } catch (error) { return controlError(error); }
}

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authJson({ error: "FORBIDDEN_ORIGIN" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return authJson({ error: "INVALID_REQUEST" }, 400);
  }
  let input;
  try { input = createSchema.safeParse(await readAuthJson(request, 16_384)); }
  catch { return authJson({ error: "INVALID_REQUEST" }, 400); }
  if (!input.success) return authJson({ error: "INVALID_REQUEST" }, 400);
  try {
    const context = await currentStoreContext("roles.manage");
    const role = await createTenantRole(context, input.data);
    return authJson({ role }, 201);
  } catch (error) { return controlError(error); }
}
