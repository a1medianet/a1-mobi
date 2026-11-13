import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.APP_ORIGIN || "http://127.0.0.1:3185";
const chrome = process.env.CHROME_BIN;
const outputDir = process.env.ABC_VISUAL_DIR || "artifacts/pilot";

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
  const response = await fetch("http://127.0.0.1:9229/json/new?" + encodeURIComponent(url), { method: "PUT" });
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
  const loaded = cdp.once("Page.loadEventFired", 90000);
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


const chromeProcess=spawn(chrome,[
  "--headless","--no-sandbox","--disable-gpu","--no-first-run",
  "--remote-debugging-port=9229","--user-data-dir=C:/A1Hub/a1-mobi/.local/chrome-a-reference-cdp",
  "about:blank",
],{stdio:["ignore","ignore","ignore"]});
try{
 await waitFor("http://127.0.0.1:9229/json/version",80);
 const {cdp,ws}=await createCdpTarget("about:blank");
 await navigate(cdp,base+"/product/ar",1440,900);
 const desktop=await evaluate(cdp,'({width:document.documentElement.scrollWidth,viewport:window.innerWidth,features:document.querySelectorAll(".mobi-a-feature-card").length,header:document.querySelector(".product-nav")?.getBoundingClientRect().height,hero:document.querySelector(".mobi-marketing-a")?.getBoundingClientRect().height,featureY:document.querySelector(".mobi-a-features")?.getBoundingClientRect().top,repairY:document.querySelector(".mobi-a-repair-story")?.getBoundingClientRect().top,icons:document.querySelectorAll(".mobi-a-feature-icon svg").length})');
 assert(desktop.width<=desktop.viewport,"A desktop horizontal overflow: "+JSON.stringify(desktop));
 assert(desktop.features===6 && desktop.icons===6,"A six real SVG feature icons missing");
 assert(desktop.hero<620,"A hero too tall for approved reference: "+JSON.stringify(desktop));
 assert(await evaluate(cdp,'document.querySelector(".mobi-a-store-bridge")?.getAttribute("href")==="/store-preview"'),"A to B link missing");
 assert(await evaluate(cdp,'[...document.querySelectorAll(".mobi-a-cta-row a")].length===2'),"A CTA pair missing");
 await evaluate(cdp,'[...document.querySelectorAll("nextjs-portal")].forEach(el=>el.style.display="none");true');
 await capture(cdp,"a-reference-ar-desktop");
 await navigate(cdp,base+"/product/ar",390,844);
 const mobile=await evaluate(cdp,'({width:document.documentElement.scrollWidth,viewport:window.innerWidth,features:document.querySelectorAll(".mobi-a-feature-card").length,icons:document.querySelectorAll(".mobi-a-feature-icon svg").length})');
 assert(mobile.width<=mobile.viewport,"A mobile horizontal overflow: "+JSON.stringify(mobile));
 assert(mobile.features===6 && mobile.icons===6,"A mobile features missing");
 await evaluate(cdp,'[...document.querySelectorAll("nextjs-portal")].forEach(el=>el.style.display="none");true');
 await capture(cdp,"a-reference-ar-mobile");
 await navigate(cdp,base+"/product/en",1440,900);
 assert(await evaluate(cdp,'Boolean(document.querySelector(".mobi-marketing-a h1")?.textContent.includes("inventory"))'),"English A not loaded");
 await evaluate(cdp,'[...document.querySelectorAll("nextjs-portal")].forEach(el=>el.style.display="none");true');
 await capture(cdp,"a-reference-en-desktop");
 ws.close();
 await writeFile(outputDir+"/a-reference-result.json",JSON.stringify({status:"PASS",date:"2026-10-19",desktop,mobile,images:["a-reference-ar-desktop.png","a-reference-ar-mobile.png","a-reference-en-desktop.png"],visualSignoff:"PENDING_OWNER",note:"Dev-mode screenshot; not a public deployment."},null,2)+"\n");
 console.log("A_REFERENCE_BROWSER_PASS",JSON.stringify({desktop,mobile}));
}finally{chromeProcess.kill("SIGTERM");}
