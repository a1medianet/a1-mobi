import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const base = process.env.APP_ORIGIN || "http://127.0.0.1:3224";
const chrome = process.env.CHROME_BIN;
const outputDir = process.env.ABC_VISUAL_DIR || "docs/reviews/2026-10-20/operation-breakdown-chart";

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
  const response = await fetch("http://127.0.0.1:9235/json/new?" + encodeURIComponent(url), { method: "PUT" });
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



const chromeProcess = spawn(chrome, [
  "--headless", "--no-sandbox", "--disable-gpu", "--no-first-run",
  "--remote-debugging-port=9235",
  "--user-data-dir=C:/A1Hub/a1-mobi/.local/chrome-operation-breakdown", "about:blank"
], { stdio: "ignore" });
try {
  await waitFor("http://127.0.0.1:9235/json/version", 100);
  const { cdp, ws } = await createCdpTarget("about:blank");
  const results = [];
  try {
    for (const locale of ["ar", "en"]) for (const width of [1440, 390]) {
      await navigate(cdp, base+"/"+locale, width, 1000);
      // Authenticated dashboard is intentionally not accessed. Render isolated real component evidence.
      const html = await readFile(outputDir+'/'+locale+'.html', 'utf8');
      const {frameTree} = await cdp.send('Page.getFrameTree');
      await cdp.send('Page.setDocumentContent', {frameId:frameTree.frame.id, html});
      await evaluate(cdp, 'document.fonts.ready.then(()=>true)');
      const chart = await evaluate(cdp, `(() => {
        const chart = document.querySelector('.operation-breakdown-chart');
        if (!chart) return {missing:true,title:document.title,text:document.body.innerText.slice(0,500)};
        const tracks = [...chart.querySelectorAll('.operation-breakdown-track')];
        return { text:chart.innerText, dir:getComputedStyle(chart).direction,
          overflow:document.documentElement.scrollWidth>innerWidth,
          bars:tracks.map(track => {const fill=track.firstElementChild;const t=track.getBoundingClientRect(),f=fill.getBoundingClientRect();return {width:parseFloat(fill.style.width),ratio:f.width/t.width*100,zeroAligned:Math.abs(getComputedStyle(chart).direction==='rtl'?t.right-f.right:t.left-f.left)<1};}),
          height:chart.getBoundingClientRect().height };
      })()`);
      assert(!chart.missing, "Chart absent: "+JSON.stringify(chart));
      assert(!chart.overflow, "Horizontal overflow");
      assert(chart.bars.map(b=>b.width).join(',')==='40,40,20', 'Incorrect count bars');
      assert(chart.bars.every(b=>b.zeroAligned&&Math.abs(b.width-b.ratio)<0.1),'Bar scale/origin mismatch');
      assert(chart.dir===(locale==='ar'?'rtl':'ltr'),'Wrong direction');
      await evaluate(cdp, `document.querySelector('.operation-breakdown-chart').scrollIntoView({block:'center'});true`);
      await capture(cdp, `${locale}-${width}`);
      results.push({locale,width,mode:"isolated component preview; not authenticated dashboard",origin:base,...chart});
    }
    await writeFile(outputDir+'/browser-results.json',JSON.stringify(results,null,2));
    console.log(JSON.stringify(results,null,2));
  } finally { ws.close(); }
} finally { chromeProcess.kill(); }
