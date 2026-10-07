import { z } from "zod";
import { readAuthJson } from "@/core/auth/request";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { controlError } from "@/server/control-http";
import { updateStoreUser } from "@/server/foundation-control";

export const runtime = "nodejs";
const updateSchema = z.object({
  displayName: z.string().trim().min(1).max(160).optional(),
  email: z.string().trim().email().max(254).optional(),
  locale: z.enum(["ar", "en"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(12).max(256).optional(),
  roleIds: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
}).strict().refine(value => Object.keys(value).length > 0);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOriginMutation(request)) return authJson({ error: "FORBIDDEN_ORIGIN" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return authJson({ error: "INVALID_REQUEST" }, 400);
  }
  let input;
  try { input = updateSchema.safeParse(await readAuthJson(request)); }
  catch { return authJson({ error: "INVALID_REQUEST" }, 400); }
  if (!input.success) return authJson({ error: "INVALID_REQUEST" }, 400);
  try {
    const context = await currentStoreContext("users.manage");
    const { id } = await params;
    const user = await updateStoreUser(context, id, input.data);
    return authJson({ user });
  } catch (error) { return controlError(error); }
}
