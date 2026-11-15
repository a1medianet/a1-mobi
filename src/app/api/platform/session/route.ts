import { authJson } from "@/server/auth-http";
import { currentPlatformAdmin } from "@/server/platform-auth";
export const runtime = "nodejs";
export async function GET() {
  try { const admin = await currentPlatformAdmin(); return admin ? authJson({ admin }) : authJson({ error: "AUTH_REQUIRED" }, 401); }
  catch { return authJson({ error: "SERVICE_UNAVAILABLE" }, 503); }
}
