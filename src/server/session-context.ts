import { hashSessionToken } from "@/core/auth/session";
import { sessionContext } from "@/core/auth/session-context";
import { db } from "./db";

export async function resolveSessionContext(token: string | undefined) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: { include: {
      branch: true,
      userRoles: { include: { role: { include: {
        permissions: { include: { permission: true } },
      } } } },
    } } },
  });
  return sessionContext(session);
}
