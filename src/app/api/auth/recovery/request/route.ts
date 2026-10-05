import { after } from "next/server";
import { z } from "zod";
import { readAuthJson } from "@/core/auth/request";
import { authJson, sameOriginMutation } from "@/server/auth-http";
import {
  deliverPreparedPasswordRecovery,
  preparePasswordRecovery,
} from "@/server/recovery-service";
import { structuredLog } from "@/server/logger";

export const runtime = "nodejs";

const RESPONSE_FLOOR_MS = 250;
const schema = z.object({
  tenant: z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9-]+$/),
  email: z.string().trim().email().max(254),
}).strict();

function floorDelay(startedAt: number) {
  const remaining = RESPONSE_FLOOR_MS - (Date.now() - startedAt);
  return remaining > 0 ? new Promise(resolve => setTimeout(resolve, remaining)) : Promise.resolve();
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  if (!sameOriginMutation(request)) return authJson({ error: "FORBIDDEN_ORIGIN" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return authJson({ error: "INVALID_REQUEST" }, 400);
  }

  try {
    const input = schema.safeParse(await readAuthJson(request));
    if (!input.success) return authJson({ error: "INVALID_REQUEST" }, 400);

    const prepared = await preparePasswordRecovery(input.data.tenant, input.data.email);
    if (prepared) {
      after(async () => {
        try {
          await deliverPreparedPasswordRecovery(prepared);
        } catch (error) {
          structuredLog("error", "auth.recovery_background_delivery_failed", {
            errorType: error instanceof Error ? error.name : "UnknownError",
            tenantSlug: prepared.tenantSlug,
            userId: prepared.userId,
          });
        }
      });
    }

    await floorDelay(startedAt);
    return authJson({ accepted: true }, 202);
  } catch (error) {
    await floorDelay(startedAt);
    const response = authJson({ accepted: true }, 202);
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      response.headers.set("Retry-After", "900");
    }
    return response;
  }
}
