export type SessionSnapshot = {
  expiresAt: Date;
  revokedAt: Date | null;
  user: {
    id: string; tenantId: string; isActive: boolean;
    branch: { id: string; tenantId: string } | null;
    userRoles: Array<{ role: {
      tenantId: string;
      permissions: Array<{ permission: { code: string } }>;
    } }>;
  };
};

// Resolves branch-scoped store operations; tenant administration needs its own context.
export function sessionContext(session: SessionSnapshot | null, now = new Date()) {
  if (!session || session.revokedAt || session.expiresAt <= now) return null;
  const user = session.user;
  if (!user.isActive || !user.branch || user.branch.tenantId !== user.tenantId) return null;
  const permissions = new Set(user.userRoles
    .filter(({ role }) => role.tenantId === user.tenantId)
    .flatMap(({ role }) => role.permissions.map(({ permission }) => permission.code)));
  return { actorId: user.id, tenantId: user.tenantId, branchId: user.branch.id, permissions };
}

export function requireSessionPermission(
  context: ReturnType<typeof sessionContext>, permission: string,
) {
  if (!context) throw new Error("AUTH_REQUIRED");
  if (!context.permissions.has(permission)) throw new Error("PERMISSION_DENIED");
  return context;
}
