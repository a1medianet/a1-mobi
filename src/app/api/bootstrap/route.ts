import { z } from "zod";
import { readAuthJson } from "@/core/auth/request";
import { authJson } from "@/server/auth-http";
import { bootstrapSecretMatches, bootstrapStore } from "@/server/bootstrap-service";
import { ControlFailure, controlError } from "@/server/control-http";

export const runtime = "nodejs";
const schema = z.object({
  tenantSlug: z.string().trim().min(2).max(80).regex(/^[a-zA-Z0-9-]+$/),
  tenantName: z.string().trim().min(1).max(160),
  branchCode: z.string().trim().min(1).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  branchName: z.string().trim().min(1).max(160),
  ownerEmail: z.string().trim().email().max(254),
  ownerDisplayName: z.string().trim().min(1).max(120),
  ownerPassword: z.string().min(12).max(256),
  locale: z.enum(["ar","en"]).default("ar"),
  a1AccountId: z.string().trim().min(1).max(160).optional(),
  a1OrganizationId: z.string().trim().min(1).max(160).optional(),
}).strict();

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return authJson({ error: "INVALID_REQUEST" }, 400);
  }
  try {
    if (!bootstrapSecretMatches(request.headers.get("x-a1-bootstrap-secret"))) {
      throw new ControlFailure("BOOTSTRAP_FORBIDDEN");
    }
    const input = schema.safeParse(await readAuthJson(request, 16_384));
    if (!input.success) return authJson({ error: "INVALID_REQUEST" }, 400);
    return authJson({ bootstrap: await bootstrapStore(input.data) }, 201);
  } catch (error) { return controlError(error); }
}
