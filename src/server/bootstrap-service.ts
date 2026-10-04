import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { hashPassword } from "@/core/auth/password";
import { PERMISSION_SEEDS } from "@/core/rbac/permission-seeds";
import { db } from "./db";
import { ControlFailure } from "./control-http";

export function bootstrapSecretMatches(candidate: string | null | undefined) {
  const expected = process.env.A1_MOBI_BOOTSTRAP_SECRET;
  if (!expected || expected.length < 32) throw new ControlFailure("BOOTSTRAP_NOT_CONFIGURED");
  if (!candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function bootstrapStore(input: {
  tenantSlug: string;
  tenantName: string;
  branchCode: string;
  branchName: string;
  ownerEmail: string;
  ownerDisplayName: string;
  ownerPassword: string;
  locale: "ar" | "en";
}) {
  const passwordHash = await hashPassword(input.ownerPassword);
  try {
    return await db.$transaction(async tx => {
      if (await tx.tenant.count() !== 0) throw new ControlFailure("ALREADY_PROVISIONED");
      await tx.permission.createMany({ data: PERMISSION_SEEDS, skipDuplicates: true });
      const tenant = await tx.tenant.create({ data: {
        slug: input.tenantSlug.trim().toLowerCase(),
        name: input.tenantName.trim(),
        defaultLocale: input.locale,
      } });
      const branch = await tx.branch.create({ data: {
        tenantId: tenant.id,
        code: input.branchCode.trim().toUpperCase(),
        name: input.branchName.trim(),
      } });
      const owner = await tx.user.create({ data: {
        tenantId: tenant.id,
        branchId: branch.id,
        email: input.ownerEmail.trim().toLowerCase(),
        displayName: input.ownerDisplayName.trim(),
        passwordHash,
        locale: input.locale,
      } });
      const role = await tx.role.create({ data: {
        tenantId: tenant.id,
        code: "owner",
        name: "Owner",
        isSystem: true,
      } });
      const permissions = await tx.permission.findMany({ select: { id: true } });
      await tx.rolePermission.createMany({
        data: permissions.map(permission => ({ roleId: role.id, permissionId: permission.id })),
        skipDuplicates: true,
      });
      await tx.userRole.create({ data: { userId: owner.id, roleId: role.id } });
      await tx.auditEvent.create({ data: {
        tenantId: tenant.id,
        branchId: branch.id,
        actorId: owner.id,
        action: "foundation.bootstrap",
        entityType: "Tenant",
        entityId: tenant.id,
        after: {
          tenantSlug: tenant.slug,
          branchCode: branch.code,
          ownerId: owner.id,
          ownerEmail: owner.email,
        },
      } });
      return {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        branchId: branch.id,
        ownerId: owner.id,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof ControlFailure) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")) {
      throw new ControlFailure("ALREADY_PROVISIONED");
    }
    throw error;
  }
}
