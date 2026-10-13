const base = process.env.APP_ORIGIN || "http://127.0.0.1:3185";
const secret = process.env.A1_MOBI_BOOTSTRAP_SECRET;
if (!secret || secret.length < 32) throw new Error("A1_MOBI_BOOTSTRAP_SECRET is required for smoke");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function get(path, options={}) {
  return fetch(base + path, { redirect:"manual", ...options });
}

async function expectStatus(path, expected, options={}) {
  const response = await get(path, options);
  assert(expected.includes(response.status), path + " expected " + expected.join("/") + " got " + response.status);
  return response;
}

for (const path of ["/product/ar","/product/en","/store-preview","/product/ar/demo","/product/ar/signup"]) {
  await expectStatus(path,[200]);
}

const unauth = await expectStatus("/ar",[307,308]);
assert((unauth.headers.get("location") || "").endsWith("/ar/login"), "Back office must redirect unauthenticated users to /ar/login");

const suffix = Date.now().toString();
const tenant = "journey-" + suffix;
const email = "owner-" + suffix + "@example.test";
const password = "Journey-owner-password-" + suffix;

const bootstrap = await expectStatus("/api/bootstrap",[201],{
  method:"POST",
  headers:{
    "content-type":"application/json",
    "x-a1-bootstrap-secret":secret,
  },
  body:JSON.stringify({
    tenantSlug:tenant,
    tenantName:"HTTP Journey Store",
    branchCode:"MAIN",
    branchName:"Main Branch",
    ownerEmail:email,
    ownerDisplayName:"HTTP Journey Owner",
    ownerPassword:password,
    locale:"ar",
  }),
});
const bootstrapBody = await bootstrap.json();
assert(bootstrapBody?.bootstrap?.tenantSlug === tenant, "Bootstrap tenant mismatch");

const login = await expectStatus("/api/auth/login",[200],{
  method:"POST",
  headers:{
    "content-type":"application/json",
    origin:base,
  },
  body:JSON.stringify({tenant,email,password}),
});
const setCookie = login.headers.get("set-cookie") || "";
const cookie = setCookie.split(";")[0];
assert(cookie.includes("="), "Login did not set a session cookie");

const session = await expectStatus("/api/auth/session",[200],{headers:{cookie}});
const sessionBody = await session.json();
assert(Array.isArray(sessionBody.permissions), "Session permissions missing");
for (const permission of ["sell.create","inventory.read","repair.manage"]) {
  assert(sessionBody.permissions.includes(permission), "Owner session missing permission " + permission);
}

for (const path of ["/ar","/ar/admin","/ar/pos","/ar/inventory","/ar/repairs","/ar/customers","/ar/reports"]) {
  await expectStatus(path,[200],{headers:{cookie}});
}

const invalidLogin = await expectStatus("/api/auth/login",[401],{
  method:"POST",
  headers:{"content-type":"application/json",origin:base},
  body:JSON.stringify({tenant,email,password:"wrong-password"}),
});
const invalidBody = await invalidLogin.json();
assert(invalidBody.error === "INVALID_CREDENTIALS", "Invalid login must fail generically");

console.log("A1_MOBI_ABC_HTTP_JOURNEY_SMOKE_PASS");
