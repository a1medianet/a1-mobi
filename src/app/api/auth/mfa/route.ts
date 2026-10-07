import { authJson, currentStoreContext } from "@/server/auth-http";
import { mfaStatus } from "@/server/mfa-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const context = await currentStoreContext();
    if (!context) return authJson({ error: "AUTH_REQUIRED" }, 401);
    return authJson(await mfaStatus(context));
  } catch {
    return authJson({ error: "SERVICE_UNAVAILABLE" }, 503);
  }
}
