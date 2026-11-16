-- Provision limited, non-owner staff presets for already registered merchants.
-- Never modify an existing tenant's custom role or owner access.
INSERT INTO "Role" ("id", "tenantId", "code", "name", "isSystem", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, tenant.id, preset.code, preset.name, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant" tenant
CROSS JOIN (VALUES
  ('manager', 'Manager'), ('cashier', 'Cashier'), ('technician', 'Repair technician')
) AS preset(code, name)
ON CONFLICT ("tenantId", "code") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId", "grantedAt")
SELECT role.id, permission.id, CURRENT_TIMESTAMP
FROM "Role" role
JOIN (VALUES
 ('manager','catalog.read'),('manager','inventory.read'),('manager','sell.create'),
 ('manager','sell.return'),('manager','repair.manage'),('manager','customers.read'),
 ('manager','debt.manage'),('manager','cash.manage'),('manager','topup.manage'),
 ('manager','reports.read'),('manager','cost.read'),('manager','profit.read'),
 ('manager','device-trust.read'),
 ('cashier','catalog.read'),('cashier','inventory.read'),('cashier','sell.create'),
 ('cashier','customers.read'),('cashier','topup.manage'),('cashier','device-trust.read'),
 ('technician','catalog.read'),('technician','inventory.read'),
 ('technician','repair.manage'),('technician','customers.read'),('technician','device-trust.read')
) AS preset(code, permission_code) ON preset.code = role.code
JOIN "Permission" permission ON permission.code = preset.permission_code
WHERE role."isSystem" = true AND role.code IN ('manager','cashier','technician')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
