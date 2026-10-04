import { z } from "zod";
import { readAuthJson } from "@/core/auth/request";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { controlError } from "@/server/control-http";
import { createStoreUser, listStoreUsers } from "@/server/foundation-control";

export const runtime = "nodejs";
const createSchema = z.object({
  email: z.string().trim().email().max(254),
  displayName: z.string().trim().min(1).max(160),
  password: z.string().min(12).max(256),
  locale: z.enum(["ar", "en"]),
  roleIds: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
}).strict();

export async function GET() {
  try {
    const context = await currentStoreContext("users.manage");
    return authJson({ users: await listStoreUsers(context) });
  } catch (error) { return controlError(error); }
}

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authJson({ error: "FORBIDDEN_ORIGIN" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return authJson({ error: "INVALID_REQUEST" }, 400);
  }
  let input;
  try { input = createSchema.safeParse(await readAuthJson(request)); }
  catch { return authJson({ error: "INVALID_REQUEST" }, 400); }
  if (!input.success) return authJson({ error: "INVALID_REQUEST" }, 400);
  try {
    const context = await currentStoreContext("users.manage");
    const user = await createStoreUser(context, input.data);
    return authJson({ user }, 201);
  } catch (error) { return controlError(error); }
}
