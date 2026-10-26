import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const base = "http://127.0.0.1:3249";
const cdpPort = 9381;
const token = "catalog-ui-" + Date.now();
const out = "docs/reviews/2026-10-24/" + token;
const password = randomBytes(24).toString("hex");
const secret = randomBytes(32).toString("hex");
const email = token + "@example.test";
const result = [];
let db, server, chrome, ws, userId, stage = "preflight";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function ready(url, attempts = 180) {
  for (let n = 0; n < attempts; n++) {
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1800) })).ok) return; } catch {}
    await sleep(500);
  }
  throw Error("LOCAL_SERVICE_NOT_READY");
}
const pass = label => { result.push({ check: label, status: "PASS" }); console.log("PASS " + label); };
const originals = new Map();
try {
  assert.notEqual(process.env.NODE_ENV, "production");
  await mkdir(out, { recursive: true });
  const compose = await readFile("docker-compose.yml", "utf8");
  const value = key => { const m = compose.match(new RegExp(key + ": ([^\\r\\n]+)")); assert.ok(m); return m[1].trim(); };
  const url = new URL("postgresql://127.0.0.1:5437/" + value("POSTGRES_DB"));
  url.username = value("POSTGRES_USER"); url.password = value("POSTGRES_PASSWORD");
  url.searchParams.set("connect_timeout", "5");
  db = new PrismaClient({ datasourceUrl: url.toString(), log: [], errorFormat: "minimal" });
  await db.$queryRaw`SELECT 1`;
  pass("local-postgres");
  for (const file of ["AGENTS.md", "tsconfig.json"]) originals.set(file, await readFile(file, "utf8"));
  for (const u of [base + "/en/login", "http://127.0.0.1:" + cdpPort + "/json/version"]) {
    let used = false; try { await fetch(u, { signal: AbortSignal.timeout(1200) }); used = true; } catch {}
    assert.equal(used, false, "DEDICATED_PORT_IN_USE");
  }
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "--hostname", "127.0.0.1", "--port", "3249"], {
    env: { ...process.env, NODE_ENV: "development", DATABASE_URL: url.toString(), APP_ORIGIN: base,
      A1_MOBI_BOOTSTRAP_SECRET: secret, A1_MOBI_C_LIVE_01_ENABLED: "1", A1_MOBI_DIST_DIR: ".local/a1-mobi-catalog-compat-next" },
    stdio: "ignore", windowsHide: true,
  });
  server.on("error", () => {});
  await ready(base + "/en/login");
  pass("local-next-app");
  stage = "bootstrap";
  const boot = await fetch(base + "/api/bootstrap", { method: "POST",
    headers: { "content-type": "application/json", "x-a1-bootstrap-secret": secret },
    body: JSON.stringify({ tenantSlug: token, tenantName: "Catalog browser QA", branchCode: "MAIN", branchName: "QA branch",
      ownerEmail: email, ownerDisplayName: "QA owner", ownerPassword: password, locale: "en" }) });
  assert.equal(boot.status, 201, "BOOTSTRAP_FAILED");
  const fixture = (await boot.json()).bootstrap;
  userId = fixture.ownerId;
  const category = await db.category.create({ data: { tenantId: fixture.tenantId, code: "PART", nameAr: "قطع الغيار", nameEn: "Repair parts" } });
  const part = await db.product.create({ data: { tenantId: fixture.tenantId, categoryId: category.id,
    sku: "DISPLAY-QA", nameAr: "شاشة اختبار", nameEn: "QA Display", type: "PART", basePrice: 50 } });
  const maker = await db.manufacturer.create({ data: { tenantId: fixture.tenantId, code: "QA", name: "QA Maker" } });
  const family = await db.deviceFamily.create({ data: { tenantId: fixture.tenantId, manufacturerId: maker.id, name: "Phones" } });
  const model = await db.deviceModel.create({ data: { tenantId: fixture.tenantId, familyId: family.id, name: "QA Phone" } });
  const variant = await db.deviceVariant.create({ data: { tenantId: fixture.tenantId, modelId: model.id, name: "128GB" } });
  stage = "login";
  const login = await fetch(base + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({ tenant: token, email, password }) });
  assert.equal(login.status, 200, "LOGIN_FAILED");
  const cookie = login.headers.get("set-cookie");
  assert.match(cookie, /a1-mobi-session=/);
  pass("owner-real-auth");

  stage = "chrome";
  chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
    "--headless", "--no-sandbox", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--remote-debugging-port=" + cdpPort, "--user-data-dir=" + process.cwd() + "/.local/" + token + "-chrome", "about:blank",
  ], { stdio: "ignore", windowsHide: true });
  chrome.on("error", () => {});
  await ready("http://127.0.0.1:" + cdpPort + "/json/version", 50);
  const target = await (await fetch("http://127.0.0.1:" + cdpPort + "/json/new?about:blank", { method: "PUT" })).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(Error("CDP_CONNECT_FAILED")); });
  const pending = new Map(); let id = 0;
  ws.onmessage = event => { const m = JSON.parse(event.data); if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id); clearTimeout(p.timer);
    if (m.error) p.reject(Error("CDP_COMMAND_FAILED"));
    else p.resolve(m.result);
  }};
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    id += 1;
    const key = id, timer = setTimeout(() => { pending.delete(key); reject(Error("CDP_TIMEOUT")); }, 120000);
    pending.set(key, { resolve, reject, timer }); ws.send(JSON.stringify({ id: key, method, params }));
  });
  const evalJs = async expression => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!r.exceptionDetails, "BROWSER_EVALUATION_FAILED");
    return r.result?.value;
  };
  const wait = async expression => { for (let n = 0; n < 400; n++) { if (await evalJs(expression)) return; await sleep(300); } throw Error("BROWSER_CONDITION_TIMEOUT"); };
  const select = async (selector, value) => evalJs(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error("FIELD_MISSING");Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));return true;})()`);
  const click = async selector => evalJs(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});if(!b||b.disabled)throw Error("BUTTON_MISSING");b.click();return true;})()`);
  const shot = async name => { const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }); await writeFile(out + "/" + name + ".png", Buffer.from(r.data, "base64")); };
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
  const [cookieName, cookieValue] = cookie.split(";")[0].split("=");
  await send("Network.setCookie", { name: cookieName, value: cookieValue, url: base, httpOnly: true });
  const requestedLocale = process.env.CATALOG_BROWSER_LOCALE;
  for (const locale of (requestedLocale === "ar" || requestedLocale === "en" ? [requestedLocale] : ["en", "ar"])) {
    stage = "browser-" + locale;
    const prewarm = await fetch(base + "/" + locale + "/products", { headers: { cookie: cookie.split(";")[0] }, signal: AbortSignal.timeout(120000) });
    assert.equal(prewarm.status, 200, "OWNER_PAGE_NOT_READY");
    await send("Page.navigate", { url: base + "/" + locale + "/products" });
    await wait(`document.readyState==="complete"&&document.querySelector('section[aria-label="${locale === "ar" ? "توافق قطع الصيانة" : "Repair parts compatibility"}"] select')?.options.length>=2`);
    const geometry = await evalJs(`(()=>{const s=document.querySelector(".sidebar").getBoundingClientRect(),w=document.querySelector(".workspace").getBoundingClientRect(),m=document.querySelector(".module-page").getBoundingClientRect();return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,sidebar:{left:s.left,right:s.right},workspace:{left:w.left,right:w.right},main:{left:m.left,right:m.right}}})()`);
    console.log("LAYOUT " + locale + " " + JSON.stringify(geometry));
    assert.ok(geometry.scroll <= geometry.viewport, "DESKTOP_HORIZONTAL_OVERFLOW");
    assert.ok(locale === "ar" ? geometry.main.right <= geometry.sidebar.left + 1 : geometry.main.left >= geometry.sidebar.right - 1, "SIDEBAR_CONTENT_OVERLAP");
    const label = `section[aria-label="${locale === "ar" ? "توافق قطع الصيانة" : "Repair parts compatibility"}"]`;
    const opts = label + " select";
    await select(opts + ":nth-of-type(1)", part.id).catch(async () => select(label + " label:first-of-type select", part.id));
    await wait(`document.querySelectorAll(${JSON.stringify(label + " select")})[1]?.options.length>=2`);
    await select(label + " label:nth-of-type(2) select", variant.id);
    await click(label + " button.primary");
    await wait(`document.querySelector(${JSON.stringify(label)})?.textContent.includes(${JSON.stringify(locale === "ar" ? "تم ربط القطعة بالطراز." : "Compatibility saved.")})`);
    await shot(locale + "-compatibility-linked");
    assert.equal(await db.productCompatibility.count({ where: { productId: part.id, deviceVariantId: variant.id } }), 1);
    await click(label + " li button");
    await wait(`document.querySelector(${JSON.stringify(label)})?.textContent.includes(${JSON.stringify(locale === "ar" ? "تم حذف علاقة التوافق." : "Compatibility removed.")})`);
    await shot(locale + "-compatibility-removed");
    assert.equal(await db.productCompatibility.count({ where: { productId: part.id, deviceVariantId: variant.id } }), 0);
    pass("owner-browser-" + locale + "-link-unlink");
    stage = "mobile-" + locale;
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(700);
    const mobile = await evalJs(`(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,sidebarHidden:getComputedStyle(document.querySelector(".sidebar")).display==="none",mainWidth:document.querySelector(".module-page").getBoundingClientRect().width}))()`);
    console.log("LAYOUT mobile-" + locale + " " + JSON.stringify(mobile));
    assert.ok(mobile.viewport <= 390 && mobile.scroll <= mobile.viewport + 1, "MOBILE_HORIZONTAL_OVERFLOW");
    assert.ok(mobile.sidebarHidden && mobile.mainWidth <= mobile.viewport + 1, "MOBILE_LAYOUT_OVERFLOW");
    await shot(locale + "-products-mobile");
    pass("owner-browser-" + locale + "-mobile-layout");
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
  }
} catch (error) {
  process.exitCode = 1;
  result.push({ check: "browser-gate", status: "FAILED", stage, type: error.name, code: /^[A-Z_]+$/.test(error.message ?? "") ? error.message : undefined });
  console.log("FAIL browser-gate " + error.name);
} finally {
  ws?.close();
  for (const child of [chrome, server]) {
    if (!child?.pid) continue;
    if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    else child.kill();
  }
  await db?.session.updateMany({ where: { userId: userId ?? "__never__" }, data: { revokedAt: new Date() } }).catch(() => {});
  await db?.$disconnect();
  for (const [path, original] of originals) {
    const current = await readFile(path, "utf8").catch(() => original);
    if (path === "AGENTS.md" && !original.includes("<!-- BEGIN:nextjs-agent-rules -->")) {
      const cleaned = current.replace(/\s*<!-- BEGIN:nextjs-agent-rules -->[\s\S]*?<!-- END:nextjs-agent-rules -->\s*/g, "");
      if (cleaned.trimEnd() === original.trimEnd()) await writeFile(path, original);
    }
    if (path === "tsconfig.json") {
      const before = JSON.parse(original), after = JSON.parse(current);
      after.include = after.include.filter(x => before.include.includes(x) || !x.startsWith(".local/a1-mobi-catalog-compat-next/"));
      if (JSON.stringify(after) === JSON.stringify(before)) await writeFile(path, original);
    }
  }
  await writeFile(out + "/results.json", JSON.stringify({ status: process.exitCode ? "INCOMPLETE" : "PASS", checks: result,
    limits: ["Synthetic owner, local database, real Chrome", "No production deployment or physical device tests"] }, null, 2));
  console.log("EVIDENCE " + out);
}
