import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { hashPassword } from "@/core/auth/password";
import { normalizeAccountHandle, internalAccountAddress } from "./account-handle";
import { PERMISSION_SEEDS } from "@/core/rbac/permission-seeds";
import { STAFF_ROLE_PRESETS } from "@/core/rbac/staff-role-presets";
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
  username?: string;
  recoveryEmail?: string;
  locale: "ar" | "en";
  a1AccountId?: string | null;
  a1OrganizationId?: string | null;
}) {
  const tenantSlug = input.tenantSlug.trim().toLowerCase();
  const handle = input.username === undefined ? null : normalizeAccountHandle(input.username);
  if (input.username !== undefined && !handle) throw new ControlFailure("INVALID_ACCOUNT_HANDLE");
  const ownerEmail = handle ? internalAccountAddress(handle) : input.ownerEmail.trim().toLowerCase();
  const passwordHash = await hashPassword(input.ownerPassword);

  try {
    return await db.$transaction(async tx => {
      const existing = await tx.tenant.findFirst({
        where: { slug: tenantSlug },
        select: { id: true },
      });
      if (existing) throw new ControlFailure("CONFLICT");

      await tx.permission.createMany({ data: PERMISSION_SEEDS, skipDuplicates: true });

      const tenant = await tx.tenant.create({ data: {
        slug: tenantSlug,
        name: input.tenantName.trim(),
        defaultLocale: input.locale,
        a1AccountId: input.a1AccountId?.trim() || null,
        a1OrganizationId: input.a1OrganizationId?.trim() || null,
      } });
      // Stable per-store Billing identity; the slug can change without starting a second trial.
      const billingTenantKey = "mobi:" + tenant.id;
      await tx.tenant.update({ where: { id: tenant.id }, data: { billingTenantKey } });

      const branch = await tx.branch.create({ data: {
        tenantId: tenant.id,
        code: input.branchCode.trim().toUpperCase(),
        name: input.branchName.trim(),
      } });

      const owner = await tx.user.create({ data: {
        tenantId: tenant.id,
        branchId: branch.id,
        email: ownerEmail,
        recoveryEmail: handle ? (input.recoveryEmail?.trim().toLowerCase() || null) : null,
        recoveryEmailVerifiedAt: null,
        forwardNotifications: false,
        displayName: input.ownerDisplayName.trim(),
        passwordHash,
        locale: input.locale,
      } });

      if (handle) {
        // Unique DB constraint guarantees atomic handle reservation across tenants.
        const previous = await tx.user.findFirst({ where: { email: ownerEmail, id: { not: owner.id } }, select: { id: true } });
        if (previous) throw new ControlFailure("CONFLICT");
        await tx.accountHandle.create({ data: { handle, userId: owner.id } });
      }

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

      await tx.role.createMany({
        data: STAFF_ROLE_PRESETS.map(preset => ({
          tenantId: tenant.id, code: preset.code, name: preset.name, isSystem: true,
        })),
        skipDuplicates: true,
      });
      const staffRoles = await tx.role.findMany({
        where: { tenantId: tenant.id, code: { in: STAFF_ROLE_PRESETS.map(preset => preset.code) } },
        select: { id: true, code: true },
      });
      const permissionIds = await tx.permission.findMany({ select: { id: true, code: true } });
      await tx.rolePermission.createMany({
        data: staffRoles.flatMap(staffRole => {
          const preset = STAFF_ROLE_PRESETS.find(preset => preset.code === staffRole.code);
          return permissionIds.filter(permission => preset?.permissions.some(code => code === permission.code))
            .map(permission => ({ roleId: staffRole.id, permissionId: permission.id }));
        }),
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
          billingTenantKey,
          branchCode: branch.code,
          ownerId: owner.id,
          ownerEmail: owner.email,
          accountHandle: handle,
          a1AccountId: tenant.a1AccountId,
          a1OrganizationId: tenant.a1OrganizationId,
        },
      } });

      return {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        billingTenantKey,
        branchId: branch.id,
        ownerId: owner.id,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof ControlFailure) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")) {
      throw new ControlFailure("CONFLICT");
    }
    throw error;
  }
}


export async function rollbackProvisionedStore(tenantId:string){
  await db.$transaction(async tx=>{
    const tenant=await tx.tenant.findUnique({where:{id:tenantId},select:{id:true}});
    if(!tenant)return;

    const users=await tx.user.findMany({where:{tenantId},select:{id:true}});
    const userIds=users.map(user=>user.id);
    const roles=await tx.role.findMany({where:{tenantId},select:{id:true}});
    const roleIds=roles.map(role=>role.id);
    const credentials=userIds.length
      ? await tx.mfaCredential.findMany({where:{userId:{in:userIds}},select:{id:true}})
      : [];
    const credentialIds=credentials.map(credential=>credential.id);

    await tx.auditEvent.deleteMany({where:{tenantId}});
    if(userIds.length){
      await tx.session.deleteMany({where:{userId:{in:userIds}}});
      await tx.passwordResetToken.deleteMany({where:{userId:{in:userIds}}});
      await tx.userRole.deleteMany({where:{userId:{in:userIds}}});
    }
    if(credentialIds.length){
      await tx.mfaRecoveryCode.deleteMany({where:{credentialId:{in:credentialIds}}});
    }
    if(userIds.length){
      await tx.mfaCredential.deleteMany({where:{userId:{in:userIds}}});
    }
    if(roleIds.length){
      await tx.rolePermission.deleteMany({where:{roleId:{in:roleIds}}});
    }
    await tx.user.deleteMany({where:{tenantId}});
    await tx.role.deleteMany({where:{tenantId}});
    await tx.branch.deleteMany({where:{tenantId}});
    await tx.tenant.delete({where:{id:tenantId}});
  });
}
