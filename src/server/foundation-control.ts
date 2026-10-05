import { Prisma } from "@prisma/client";
import { hashPassword } from "@/core/auth/password";
import { PERMISSIONS } from "@/core/rbac/permissions";
import { PERMISSION_SEEDS } from "@/core/rbac/permission-seeds";
import { db } from "./db";
import { ControlFailure } from "./control-http";

export type ControlContext = {
  actorId: string;
  tenantId: string;
  branchId: string;
  permissions: Set<string>;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}
function normalizeRoleCode(value: string) {
  return value.trim().toLowerCase();
}
function assertPermissionCodes(codes: readonly string[]) {
  const allowed = new Set<string>(PERMISSIONS);
  if (codes.some(code => !allowed.has(code))) throw new ControlFailure("INVALID_PERMISSION");
}
function assertGrantablePermissions(ctx: ControlContext, codes: readonly string[]) {
  // A role administrator may only delegate permissions they already hold.
  // This prevents roles.manage from becoming an indirect privilege-escalation path.
  if (codes.some(code => !ctx.permissions.has(code))) {
    throw new ControlFailure("PERMISSION_DENIED");
  }
}
async function ensurePermissionRows(tx: Prisma.TransactionClient) {
  await tx.permission.createMany({ data: PERMISSION_SEEDS, skipDuplicates: true });
}
async function rolesForTenant(tx: Prisma.TransactionClient, tenantId: string, roleIds: readonly string[]) {
  if (!roleIds.length) return [];
  const roles = await tx.role.findMany({
    where: { tenantId, id: { in: [...new Set(roleIds)] } },
    select: {
      id: true,
      code: true,
      isSystem: true,
      permissions: { select: { permission: { select: { code: true } } } },
    },
  });
  if (roles.length !== new Set(roleIds).size) throw new ControlFailure("INVALID_ROLE");
  return roles;
}
function assertAssignableRoles(ctx: ControlContext, roles: Array<{
  isSystem: boolean;
  permissions: Array<{ permission: { code: string } }>;
}>) {
  const foundationManager = ctx.permissions.has("foundation.manage");
  if (roles.some(role => role.isSystem) && !foundationManager) {
    throw new ControlFailure("PERMISSION_DENIED");
  }
  if (foundationManager) return;
  assertGrantablePermissions(
    ctx,
    roles.flatMap(role => role.permissions.map(grant => grant.permission.code)),
  );
}
function safeUserSnapshot(user: {
  id: string; email: string; displayName: string; isActive: boolean; branchId: string | null;
  userRoles?: Array<{ role: { id: string; code: string } }>;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isActive: user.isActive,
    branchId: user.branchId,
    roles: user.userRoles?.map(x => ({ id: x.role.id, code: x.role.code })) ?? [],
  };
}
async function audit(tx: Prisma.TransactionClient, ctx: ControlContext, input: {
  action: string; entityType: string; entityId: string; before?: Prisma.InputJsonValue; after?: Prisma.InputJsonValue;
}) {
  await tx.auditEvent.create({ data: {
    tenantId: ctx.tenantId,
    branchId: ctx.branchId,
    actorId: ctx.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    before: input.before,
    after: input.after,
  } });
}

export async function listStoreUsers(ctx: ControlContext) {
  return db.user.findMany({
    where: { tenantId: ctx.tenantId, branchId: ctx.branchId },
    orderBy: [{ isActive: "desc" }, { displayName: "asc" }],
    select: {
      id: true, email: true, displayName: true, locale: true, isActive: true, branchId: true,
      userRoles: { where: { role: { tenantId: ctx.tenantId } },
        select: { role: { select: { id: true, code: true, name: true } } } },
    },
  });
}

export async function createStoreUser(ctx: ControlContext, input: {
  email: string; displayName: string; password: string; locale: "ar" | "en"; roleIds?: string[];
}) {
  if (input.roleIds?.length && !ctx.permissions.has("roles.manage")) {
    throw new ControlFailure("PERMISSION_DENIED");
  }
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.$transaction(async tx => {
      const branch = await tx.branch.findFirst({ where: { id: ctx.branchId, tenantId: ctx.tenantId } });
      if (!branch) throw new ControlFailure("NOT_FOUND");
      const roles = await rolesForTenant(tx, ctx.tenantId, input.roleIds ?? []);
      assertAssignableRoles(ctx, roles);
      const user = await tx.user.create({ data: {
        tenantId: ctx.tenantId,
        branchId: ctx.branchId,
        email: normalizeEmail(input.email),
        displayName: input.displayName.trim(),
        passwordHash,
        locale: input.locale,
        userRoles: roles.length ? { create: roles.map(role => ({ roleId: role.id })) } : undefined,
      }, include: { userRoles: { include: { role: true } } } });
      await audit(tx, ctx, {
        action: "foundation.user.create", entityType: "User", entityId: user.id,
        after: safeUserSnapshot(user) as Prisma.InputJsonValue,
      });
      return safeUserSnapshot(user);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ControlFailure("CONFLICT");
    }
    throw error;
  }
}

export async function updateStoreUser(ctx: ControlContext, userId: string, input: {
  displayName?: string; email?: string; locale?: "ar" | "en"; isActive?: boolean;
  password?: string; roleIds?: string[];
}) {
  if (input.roleIds && !ctx.permissions.has("roles.manage")) {
    throw new ControlFailure("PERMISSION_DENIED");
  }
  if (userId === ctx.actorId && (input.isActive === false || input.roleIds !== undefined)) {
    throw new ControlFailure("SELF_PROTECTION");
  }
  const passwordHash = input.password ? await hashPassword(input.password) : undefined;
  try {
    return await db.$transaction(async tx => {
      const before = await tx.user.findFirst({
        where: { id: userId, tenantId: ctx.tenantId, branchId: ctx.branchId },
        include: { userRoles: { include: { role: true } } },
      });
      if (!before) throw new ControlFailure("NOT_FOUND");
      const roles = input.roleIds ? await rolesForTenant(tx, ctx.tenantId, input.roleIds) : undefined;
      if (roles) assertAssignableRoles(ctx, roles);
      await tx.user.update({ where: { id: before.id }, data: {
        displayName: input.displayName?.trim(),
        email: input.email ? normalizeEmail(input.email) : undefined,
        locale: input.locale,
        isActive: input.isActive,
        passwordHash,
      } });
      if (roles) {
        await tx.userRole.deleteMany({ where: { userId: before.id } });
        if (roles.length) await tx.userRole.createMany({
          data: roles.map(role => ({ userId: before.id, roleId: role.id })),
          skipDuplicates: true,
        });
      }
      const identityChanged =
        Boolean(passwordHash) ||
        input.email !== undefined ||
        (input.isActive !== undefined && input.isActive !== before.isActive);

      if (passwordHash || (before.isActive && input.isActive === false)) {
        await tx.session.updateMany({
          where: { userId: before.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      if (identityChanged) {
        await tx.passwordResetToken.updateMany({
          where: { userId: before.id, usedAt: null },
          data: { usedAt: new Date() },
        });
      }
      const after = await tx.user.findUniqueOrThrow({
        where: { id: before.id }, include: { userRoles: { include: { role: true } } },
      });
      await audit(tx, ctx, {
        action: "foundation.user.update", entityType: "User", entityId: before.id,
        before: safeUserSnapshot(before) as Prisma.InputJsonValue,
        after: safeUserSnapshot(after) as Prisma.InputJsonValue,
      });
      return safeUserSnapshot(after);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ControlFailure("CONFLICT");
    }
    throw error;
  }
}

export async function listTenantRoles(ctx: ControlContext) {
  return db.role.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: {
      id: true, code: true, name: true, isSystem: true,
      permissions: { select: { permission: { select: { code: true, description: true } } } },
      _count: { select: { userRoles: true } },
    },
  });
}

export async function createTenantRole(ctx: ControlContext, input: {
  code: string; name: string; permissions: string[];
}) {
  assertPermissionCodes(input.permissions);
  assertGrantablePermissions(ctx, input.permissions);
  try {
    return await db.$transaction(async tx => {
      await ensurePermissionRows(tx);
      const permissionRows = await tx.permission.findMany({
        where: { code: { in: [...new Set(input.permissions)] } },
      });
      const role = await tx.role.create({ data: {
        tenantId: ctx.tenantId,
        code: normalizeRoleCode(input.code),
        name: input.name.trim(),
        permissions: permissionRows.length ? {
          create: permissionRows.map(permission => ({ permissionId: permission.id })),
        } : undefined,
      }, include: { permissions: { include: { permission: true } } } });
      await audit(tx, ctx, {
        action: "foundation.role.create", entityType: "Role", entityId: role.id,
        after: { code: role.code, name: role.name,
          permissions: role.permissions.map(x => x.permission.code) } as Prisma.InputJsonValue,
      });
      return role;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ControlFailure("CONFLICT");
    }
    throw error;
  }
}

export async function updateTenantRole(ctx: ControlContext, roleId: string, input: {
  name?: string; permissions?: string[];
}) {
  if (input.permissions) {
    assertPermissionCodes(input.permissions);
    assertGrantablePermissions(ctx, input.permissions);
  }
  return db.$transaction(async tx => {
    const before = await tx.role.findFirst({
      where: { id: roleId, tenantId: ctx.tenantId },
      include: { permissions: { include: { permission: true } } },
    });
    if (!before) throw new ControlFailure("NOT_FOUND");
    if (before.isSystem) throw new ControlFailure("SYSTEM_ROLE_IMMUTABLE");
    if (input.permissions) {
      await ensurePermissionRows(tx);
      const permissionRows = await tx.permission.findMany({
        where: { code: { in: [...new Set(input.permissions)] } },
      });
      await tx.rolePermission.deleteMany({ where: { roleId: before.id } });
      if (permissionRows.length) await tx.rolePermission.createMany({
        data: permissionRows.map(permission => ({ roleId: before.id, permissionId: permission.id })),
        skipDuplicates: true,
      });
    }
    if (input.name !== undefined) {
      await tx.role.update({ where: { id: before.id }, data: { name: input.name.trim() } });
    }
    const after = await tx.role.findUniqueOrThrow({
      where: { id: before.id }, include: { permissions: { include: { permission: true } } },
    });
    await audit(tx, ctx, {
      action: "foundation.role.update", entityType: "Role", entityId: before.id,
      before: { code: before.code, name: before.name,
        permissions: before.permissions.map(x => x.permission.code) } as Prisma.InputJsonValue,
      after: { code: after.code, name: after.name,
        permissions: after.permissions.map(x => x.permission.code) } as Prisma.InputJsonValue,
    });
    return after;
  });
}
