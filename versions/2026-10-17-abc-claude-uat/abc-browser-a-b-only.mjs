import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.APP_ORIGIN || "http://localhost:3185";
const chrome = process.env.CHROME_BIN || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const secret = process.env.A1_MOBI_BOOTSTRAP_SECRET;
const outputDir = "C:/A1Hub/a1-mobi/versions/2026-10-17-abc-claude-uat";

if (!chrome) throw new Error("CHROME_BIN is required");


function assert(condition, message) {
  if (!condition) throw new Error(message);
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitFor(url, attempts = 50) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {}
    await sleep(150);
  }
  throw new Error("Timed out waiting for " + url);
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = new Map();
    ws.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      const listeners = this.events.get(message.method) || [];
      this.events.delete(message.method);
      for (const resolve of listeners) resolve(message.params);
    };
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  once(method, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timeout waiting for " + method)), timeoutMs);
      const wrapped = value => {
        clearTimeout(timer);
        resolve(value);
      };
      const list = this.events.get(method) || [];
      list.push(wrapped);
      this.events.set(method, list);
    });
  }
}

async function createCdpTarget(url) {
  const response = await fetch("http://127.0.0.1:9222/json/new?" + encodeURIComponent(url), { method: "PUT" });
  assert(response.ok, "Unable to create Chrome target");
  const target = await response.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error("Chrome DevTools websocket failed"));
  });
  const cdp = new Cdp(ws);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");
  return { cdp, ws };
}

async function navigate(cdp, url, width, height) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const loaded = cdp.once("Page.loadEventFired");
  await cdp.send("Page.navigate", { url });
  await loaded;
  await sleep(250);
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error("Browser evaluate failed: " + expression);
  return result.result?.value;
}

async function capture(cdp, name) {
  const result = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputDir + "/" + name + ".png", Buffer.from(result.data, "base64"));
}

const chromeProcess = spawn(chrome, [
  "--headless",
  "--no-sandbox",
  "--disable-gpu",
  "--remote-debugging-port=9222",
  "--user-data-dir=C:/A1Hub/a1-mobi/versions/2026-10-17-abc-claude-uat/chrome-profile-cdp",
  "--no-first-run",
  "--no-default-browser-check",
  "about:blank",
], { stdio: ["ignore", "ignore", "ignore"] });

try {
  await waitFor("http://127.0.0.1:9222/json/version");
  const { cdp, ws } = await createCdpTarget("about:blank");

  await navigate(cdp, base + "/product/ar", 1440, 900);
  await capture(cdp, "a-desktop-cdp");
  assert(await evaluate(cdp, 'document.querySelectorAll(".mobi-a-feature-card").length === 6'), "A must show six feature cards");
  assert(await evaluate(cdp, 'Boolean(document.querySelector(".mobi-a-device-mockup"))'), "A dashboard device mockup missing");
  assert(await evaluate(cdp, 'Boolean(document.querySelector(".mobi-headline-blue") && document.querySelector(".mobi-headline-orange"))'), "A colored headline missing");
  assert(await evaluate(cdp, 'document.querySelector(".mobi-wordmark")?.textContent.replace(/\\s+/g,"").includes("A1Mobi")'), "A1 Mobi wordmark order is wrong");

  await navigate(cdp, base + "/store-preview", 1440, 900);
  await capture(cdp, "b-desktop-cdp");
  const bViewport = await evaluate(cdp, '({scrollHeight:document.documentElement.scrollHeight,innerHeight:window.innerHeight})');
  assert(bViewport.scrollHeight <= bViewport.innerHeight, "B exceeds 1440x900 viewport: " + JSON.stringify(bViewport));
  assert(await evaluate(cdp, 'document.querySelectorAll(".mobi-store-product").length === 4'), "B must render four featured products");
  assert(await evaluate(cdp, 'document.querySelector(".mobi-store-whatsapp")?.disabled === true'), "B WhatsApp must be disabled until configured");
  assert(await evaluate(cdp, 'document.querySelector(".mobi-store-btn-secondary")?.disabled === false'), "B repair information must remain accessible");
  assert(await evaluate(cdp, '[...document.querySelectorAll(".mobi-store-add")].every(button=>!button.disabled)'), "B preview basket needs functional add buttons");

  await evaluate(cdp, '(() => { const input=document.querySelector(".mobi-store-header-search input"); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set; setter.call(input,"AirPods"); input.dispatchEvent(new Event("input",{bubbles:true})); return true; })()');
  await sleep(250);
  assert(await evaluate(cdp, 'document.querySelectorAll(".mobi-store-product").length === 1'), "B search did not filter products");
  await evaluate(cdp, 'document.querySelector(".mobi-store-add").click(); true');
  await sleep(200);
  assert(await evaluate(cdp, 'document.querySelector(".mobi-store-basket-panel")?.getAttribute("role") === "dialog"'), "B preview basket must open");
  assert(await evaluate(cdp, 'document.querySelector(".mobi-store-basket-trigger strong")?.textContent === "1"'), "B preview basket count incorrect");
  assert(await evaluate(cdp, 'document.querySelector(".mobi-store-basket-notice")?.textContent.length > 20'), "B preview basket requires an explicit illustrative notice");
  await evaluate(cdp, 'document.querySelector(".mobi-store-basket-title button").click(); true');
  await evaluate(cdp, 'document.querySelector(".mobi-store-lang").click(); true');
  await sleep(200);
  assert(await evaluate(cdp, 'document.querySelector(".mobi-store")?.getAttribute("lang") === "en"'), "B language toggle failed");


  await navigate(cdp, base + "/product/ar", 390, 844);
  await capture(cdp, "a-mobile-cdp");
  const aMobile = await evaluate(cdp, '({scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth})');
  assert(aMobile.scrollWidth <= aMobile.innerWidth, "A mobile horizontal overflow: " + JSON.stringify(aMobile));
  assert(await evaluate(cdp, '!/[\u00d8\u00d9]/u.test(document.body.innerText)'), "A mobile Arabic encoding corrupted");
  await navigate(cdp, base + "/store-preview", 390, 844);
  await capture(cdp, "b-mobile-cdp");
  const bMobile = await evaluate(cdp, '({scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth})');
  assert(bMobile.scrollWidth <= bMobile.innerWidth, "B mobile horizontal overflow: " + JSON.stringify(bMobile));
  assert(await evaluate(cdp, '!/[\u00d8\u00d9]/u.test(document.body.innerText)'), "B mobile Arabic encoding corrupted");
  assert(await evaluate(cdp, 'getComputedStyle(document.querySelector(".mobi-store-header-search input")).opacity === "1"'), "B mobile search must be visible");
  assert(await evaluate(cdp, 'getComputedStyle(document.querySelector(".mobi-store-header nav")).display === "none"'), "B mobile nav must be collapsed initially");
  await evaluate(cdp, 'document.querySelector(".mobi-store-menu-button").click(); true');
  await sleep(100);
  assert(await evaluate(cdp, 'getComputedStyle(document.querySelector(".mobi-store-header nav")).display !== "none"'), "B mobile menu must open");
  await evaluate(cdp, 'document.querySelector(".mobi-store-menu-button").click(); true');
  await sleep(100);
  assert(await evaluate(cdp, 'getComputedStyle(document.querySelector(".mobi-store-header nav")).display === "none"'), "B mobile menu must close");


  console.log("ABC_VISUAL_METRICS",JSON.stringify({
    aMobile,bMobile,bViewport,
    bDom:await evaluate(cdp, '({width:window.innerWidth,scroll:document.documentElement.scrollWidth,nav:getComputedStyle(document.querySelector(".mobi-store-header nav")).display})')
  }));
  ws.close();
} finally {
  chromeProcess.kill("SIGTERM");
}
