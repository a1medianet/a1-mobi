import { spawn } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const db = new PrismaClient();
const base = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3102";
const chrome = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = Number(process.env.CDP_PORT ?? "9224");
const profile = "C:\\Dev\\a1-mobi-cdp-profile-" + process.pid;
const evidenceDir = "C:\\Dev\\a1-mobi-foundation-control-20261003\\docs\\reviews\\2026-10-04";
const permissions = [
  "foundation.manage","users.manage","roles.manage","audit.read","feature-flags.manage",
  "catalog.read","inventory.read","sell.create","repair.manage","customers.read","debt.manage",
  "cash.manage","topup.manage","reports.read","cost.read","profit.read","device-trust.read",
  "device-trust.report","device-trust.override",
];
const suffix = randomUUID();
let tenant, branch, owner, role, chromeProcess, cdp;

function must(value, message) { if (!value) throw new Error(message); }
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitJson(url, attempts = 50) {
  for (let i = 0; i < attempts; i++) {
    try { const r = await fetch(url); if (r.ok) return r.json(); } catch {}
    await delay(100);
  }
  throw new Error("CDP_NOT_READY");
}

async function connectCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = event => {
    const msg = JSON.parse(event.data);
    if (!msg.id) return;
    const slot = pending.get(msg.id);
    if (!slot) return;
    pending.delete(msg.id);
    if (msg.error) slot.reject(new Error(msg.error.message));
    else slot.resolve(msg.result ?? {});
  };
  return {
    ws,
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const callId = ++id;
        pending.set(callId, { resolve, reject });
        ws.send(JSON.stringify({ id: callId, method, params }));
      });
    },
  };
}

async function navigate(url, width, height, mobile) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile,
    screenWidth: width, screenHeight: height,
  });
  await cdp.send("Page.navigate", { url });
  for (let i = 0; i < 60; i++) {
    await delay(100);
    const state = await cdp.send("Runtime.evaluate", {
      expression: "document.readyState", returnByValue: true,
    });
    if (state.result?.value === "complete") break;
  }
  await delay(500);
}

async function evaluate(expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise: true,
  });
  return result.result?.value;
}

async function screenshot(path) {
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(path, Buffer.from(shot.data, "base64"));
}

try {
  await mkdir(evidenceDir, { recursive: true });
  await db.permission.createMany({
    data: permissions.map(code => ({ code, description: "A1 Mobi permission: " + code })),
    skipDuplicates: true,
  });
  tenant = await db.tenant.create({ data: { slug: "visual-" + suffix, name: "Visual QA Store", defaultLocale: "ar" } });
  branch = await db.branch.create({ data: { tenantId: tenant.id, code: "MAIN", name: "Main branch" } });
  owner = await db.user.create({ data: {
    tenantId: tenant.id, branchId: branch.id,
    email: "owner-" + suffix + "@example.test", displayName: "Visual QA Owner",
    passwordHash: await argon2.hash("Visual-password-" + suffix, { type: argon2.argon2id }), locale: "ar",
  } });
  role = await db.role.create({ data: { tenantId: tenant.id, code: "owner", name: "Owner", isSystem: true } });
  const permissionRows = await db.permission.findMany({ where: { code: { in: permissions } }, select: { id: true } });
  await db.rolePermission.createMany({ data: permissionRows.map(p => ({ roleId: role.id, permissionId: p.id })) });
  await db.userRole.create({ data: { userId: owner.id, roleId: role.id } });

  const password = "Visual-password-" + suffix;
  chromeProcess = spawn(chrome, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--remote-debugging-port=" + port, "--user-data-dir=" + profile, "about:blank",
  ], { stdio: "ignore" });
  await waitJson("http://127.0.0.1:" + port + "/json/version");
  const targetResponse = await fetch("http://127.0.0.1:" + port + "/json/new?about:blank", { method: "PUT" });
  const target = await targetResponse.json();
  cdp = await connectCdp(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");

  await navigate(base + "/en/login", 1440, 1000, false);
  let loginReady = false;
  for (let i = 0; i < 40; i++) {
    loginReady = await evaluate("!!document.querySelector('form input[name=tenant]')");
    if (loginReady) break;
    await delay(150);
  }
  must(loginReady, "LOGIN_FORM_NOT_READY");
  const loginScript = `
    (() => {
      const set = (name, value) => {
        const input = document.querySelector('input[name="' + name + '"]');
        if (!input) throw new Error('missing ' + name);
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };
      set('tenant', ${JSON.stringify(tenant.slug)});
      set('email', ${JSON.stringify(owner.email)});
      set('password', ${JSON.stringify(password)});
      document.querySelector('form').requestSubmit();
      return true;
    })()
  `;
  must(await evaluate(loginScript), "LOGIN_SUBMIT");
  let sessionStatus = 0;
  for (let i = 0; i < 40; i++) {
    await delay(150);
    sessionStatus = await evaluate("fetch('/api/auth/session',{cache:'no-store'}).then(r=>r.status)");
    if (sessionStatus === 200) break;
  }
  must(sessionStatus === 200, "BROWSER_LOGIN_" + sessionStatus);

  await navigate(base + "/en/settings/team", 1440, 1000, false);
  let enText = "";
  for (let i = 0; i < 40; i++) {
    enText = await evaluate("document.body.innerText");
    if (enText.includes("Visual QA Owner") || enText.includes("do not have permission") || enText.includes("Sign in")) break;
    await delay(150);
  }
  const enOverflow = await evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth");
  must(enText.includes("Team & access") && enText.includes("Visual QA Owner"), "EN_CONTENT:" + enText.slice(0, 240));
  must(!enOverflow, "EN_HORIZONTAL_OVERFLOW");
  await screenshot(evidenceDir + "\\team-en-desktop.png");

  await navigate(base + "/ar/settings/team", 390, 844, true);
  let arText = "";
  for (let i = 0; i < 40; i++) {
    arText = await evaluate("document.body.innerText");
    if (arText.includes("Visual QA Owner") || arText.includes("لا تملك الصلاحية") || arText.includes("تسجيل الدخول")) break;
    await delay(150);
  }
  const arDir = await evaluate("document.querySelector('.app-shell')?.getAttribute('dir')");
  const arOverflow = await evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth");
  const arOverflowDetail = await evaluate(`JSON.stringify({
    innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll('*')].map(el => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName, cls: String(el.className || '').slice(0,80), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), scrollWidth: el.scrollWidth };
    }).filter(x => x.right > document.documentElement.clientWidth + 2 || x.left < -2).slice(0,30)
  })`);
  must(arText.includes("الفريق والصلاحيات") && arText.includes("Visual QA Owner"), "AR_CONTENT");
  must(arDir === "rtl", "AR_NOT_RTL");
  await screenshot(evidenceDir + "\\team-ar-mobile.png");
  must(!arOverflow, "AR_HORIZONTAL_OVERFLOW:" + arOverflowDetail);

  await navigate(base + "/en/settings/team", 390, 844, true);
  const mobileOverflow = await evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth");
  must(!mobileOverflow, "EN_MOBILE_HORIZONTAL_OVERFLOW");
  await screenshot(evidenceDir + "\\team-en-mobile.png");

  console.log("FOUNDATION_CONTROL_BROWSER_GATE_PASS");
  console.log(JSON.stringify({
    enDesktop: "PASS", arMobile: "PASS", enMobile: "PASS",
    rtl: "PASS", horizontalOverflow: "NONE",
  }));
} finally {
  try { cdp?.ws.close(); } catch {}
  try { chromeProcess?.kill(); } catch {}
  await delay(250);
  try { await rm(profile, { recursive: true, force: true }); } catch {}
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
