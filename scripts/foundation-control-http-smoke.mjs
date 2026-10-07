import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const base = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3102";
const originHeaders = { Origin: base, "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json" };
const suffix = randomUUID();
const tenantSlug = "http-smoke-" + suffix;
const email = "owner-" + suffix + "@example.test";
const password = "Smoke-password-" + suffix;
let tenant, branch, owner, ownerRole, createdRole, createdUser;

function must(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await db.permission.createMany({
    data: [
      { code: "foundation.manage", description: "Foundation administration" },
      { code: "users.manage", description: "User administration" },
      { code: "roles.manage", description: "Role administration" },
    ],
    skipDuplicates: true,
  });
  tenant = await db.tenant.create({ data: { slug: tenantSlug, name: "HTTP smoke tenant" } });
  branch = await db.branch.create({ data: { tenantId: tenant.id, code: "MAIN", name: "Main" } });
  owner = await db.user.create({ data: {
    tenantId: tenant.id, branchId: branch.id, email, displayName: "Smoke Owner",
    passwordHash: await argon2.hash(password, { type: argon2.argon2id }), locale: "en",
  } });
  ownerRole = await db.role.create({ data: {
    tenantId: tenant.id, code: "owner-smoke", name: "Owner Smoke", isSystem: true,
  } });
  const perms = await db.permission.findMany({ where: { code: { in: ["foundation.manage","users.manage","roles.manage"] } } });
  await db.rolePermission.createMany({ data: perms.map(p => ({ roleId: ownerRole.id, permissionId: p.id })) });
  await db.userRole.create({ data: { userId: owner.id, roleId: ownerRole.id } });

  const health = await fetch(base + "/api/health", { cache: "no-store" });
  must(health.status === 200, "health status " + health.status);
  const healthBody = await health.json();
  must(healthBody.stage === "foundation" && healthBody.readiness?.database === "ready", "health payload");

  const unauth = await fetch(base + "/api/admin/users", { cache: "no-store" });
  must(unauth.status === 401, "unauth users " + unauth.status);

  const login = await fetch(base + "/api/auth/login", {
    method: "POST", headers: originHeaders,
    body: JSON.stringify({ tenant: tenantSlug, email, password }),
  });
  must(login.status === 200, "login status " + login.status);
  const setCookie = login.headers.get("set-cookie");
  must(setCookie, "missing session cookie");
  const cookie = setCookie.split(";")[0];

  const users = await fetch(base + "/api/admin/users", { headers: { Cookie: cookie }, cache: "no-store" });
  must(users.status === 200, "users status " + users.status);
  const usersBody = await users.json();
  must(usersBody.users?.some(u => u.id === owner.id), "owner missing from scoped users");

  const roleRes = await fetch(base + "/api/admin/roles", {
    method: "POST", headers: { ...originHeaders, Cookie: cookie },
    body: JSON.stringify({ code: "seller-smoke", name: "Seller Smoke", permissions: ["users.manage"] }),
  });
  must(roleRes.status === 201, "create role " + roleRes.status);
  createdRole = (await roleRes.json()).role;

  const userRes = await fetch(base + "/api/admin/users", {
    method: "POST", headers: { ...originHeaders, Cookie: cookie },
    body: JSON.stringify({
      email: "seller-" + suffix + "@example.test",
      displayName: "Seller Smoke",
      password: "Seller-password-" + suffix,
      locale: "ar",
      roleIds: [createdRole.id],
    }),
  });
  must(userRes.status === 201, "create user " + userRes.status);
  createdUser = (await userRes.json()).user;

  const patch = await fetch(base + "/api/admin/users/" + createdUser.id, {
    method: "PATCH", headers: { ...originHeaders, Cookie: cookie },
    body: JSON.stringify({ isActive: false }),
  });
  must(patch.status === 200, "patch user " + patch.status);

  const crossOrigin = await fetch(base + "/api/admin/roles", {
    method: "POST",
    headers: { Origin: "https://evil.example.test", "Sec-Fetch-Site": "cross-site", "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ code: "blocked", name: "Blocked", permissions: [] }),
  });
  must(crossOrigin.status === 403, "cross-origin role mutation " + crossOrigin.status);

  const bootstrap = await fetch(base + "/api/bootstrap", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  must(bootstrap.status === 503 || bootstrap.status === 403, "bootstrap fail-closed " + bootstrap.status);

  const logout = await fetch(base + "/api/auth/logout", {
    method: "POST", headers: { Origin: base, "Sec-Fetch-Site": "same-origin", Cookie: cookie },
  });
  must(logout.status === 200, "logout status " + logout.status);

  const afterLogout = await fetch(base + "/api/admin/users", { headers: { Cookie: cookie }, cache: "no-store" });
  must(afterLogout.status === 401, "revoked cookie still authorized " + afterLogout.status);

  console.log("FOUNDATION_CONTROL_HTTP_SMOKE_PASS");
  console.log(JSON.stringify({
    health: "200/database-ready",
    unauthenticatedAdmin: 401,
    login: 200,
    scopedUsers: 200,
    createRole: 201,
    createUser: 201,
    updateUser: 200,
    crossOriginMutation: 403,
    bootstrapWithoutConfiguredSecret: bootstrap.status,
    logout: 200,
    revokedSessionAdmin: 401,
  }));
} finally {
  if (tenant?.id) {
    await db.auditEvent.deleteMany({ where: { tenantId: tenant.id } });
    await db.session.deleteMany({ where: { user: { tenantId: tenant.id } } });
    await db.userRole.deleteMany({ where: { user: { tenantId: tenant.id } } });
    await db.rolePermission.deleteMany({ where: { role: { tenantId: tenant.id } } });
    await db.user.deleteMany({ where: { tenantId: tenant.id } });
    await db.role.deleteMany({ where: { tenantId: tenant.id } });
    await db.branch.deleteMany({ where: { tenantId: tenant.id } });
    await db.tenant.deleteMany({ where: { id: tenant.id } });
  }
  await db.$disconnect();
}
