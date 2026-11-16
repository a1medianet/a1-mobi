import { db } from "@/server/db";
import { normalizeAccountHandle, internalAccountAddress } from "@/server/account-handle";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("username") ?? "";
  const handle = normalizeAccountHandle(name);
  if (!handle) return Response.json({ available: false, reason: "INVALID_OR_RESERVED" }, { headers: { "Cache-Control": "no-store" } });
  try {
    const [reserved, oldEmail] = await Promise.all([
      db.accountHandle.findUnique({ where: { handle }, select: { handle: true } }),
      db.user.findFirst({ where: { email: internalAccountAddress(handle) }, select: { id: true } }),
    ]);
    return Response.json({ available: !reserved && !oldEmail, username: handle }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ available: false, reason: "CHECK_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
