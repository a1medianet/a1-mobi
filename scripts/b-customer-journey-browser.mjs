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
  const response = await fetch("http://127.0.0.1:9233/json/new?" + encodeURIComponent(url), { method: "PUT" });
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
 "--remote-debugging-port=9233",
 "--user-data-dir=C:/A1Hub/a1-mobi/.local/chrome-b-customer-cdp",
 "about:blank"
],{stdio:["ignore","ignore","ignore"]});
try{
 await waitFor("http://127.0.0.1:9233/json/version",100);
 const {cdp,ws}=await createCdpTarget("about:blank");
 await navigate(cdp,base+"/store-preview",1440,900);
 assert(await evaluate(cdp,'document.querySelectorAll(".mobi-store-product").length>=8'),"B products missing");
 const imageRoles = await evaluate(cdp, '({phones:[...document.querySelectorAll(".mobi-store-showcase-single img")].map(i=>({alt:i.alt,loaded:i.complete&&i.naturalWidth>0})),repair:document.querySelector(".mobi-store-repair-photo img")?.getAttribute("src"),retail:document.querySelector(".mobi-store-story-photo img")?.getAttribute("src")})');
 assert(imageRoles.phones.length===1 && imageRoles.phones.every(i=>i.loaded&&i.alt.length>4),"B named phone photography missing: "+JSON.stringify(imageRoles));
 const productPhotos=await evaluate(cdp,'Promise.all([...document.querySelectorAll(".mobi-store-product-photo img")].map(i=>{i.loading="eager";return new Promise(resolve=>{if(i.complete)return resolve({src:i.getAttribute("src"),ok:i.naturalWidth>0});i.addEventListener("load",()=>resolve({src:i.getAttribute("src"),ok:true}),{once:true});i.addEventListener("error",()=>resolve({src:i.getAttribute("src"),ok:false}),{once:true});setTimeout(()=>resolve({src:i.getAttribute("src"),ok:i.naturalWidth>0}),9000);});}))');
 assert(productPhotos.length===8&&productPhotos.every(i=>i.ok),"Missing product photography: "+JSON.stringify(productPhotos));
 assert(imageRoles.repair==="/demo/abc/repair-service.webp","Repair photo placed in wrong section");
 assert(imageRoles.retail==="/demo/abc/a-retail-hero.webp","Retail scene placed in wrong section");
 await evaluate(cdp,'[...document.querySelectorAll("nextjs-portal")].forEach(e=>e.style.display="none");true');
 await capture(cdp,"b-showcase-desktop");
 assert(await evaluate(cdp,'document.querySelector(".mobi-store-contact-shortcut")?.disabled===false'),"B contact shortcut inactive");
 assert(await evaluate(cdp,'!document.querySelector(".mobi-store-service-banner button").disabled'),"B repair info button inactive");
 await evaluate(cdp,'document.querySelector(".mobi-store-add").click();true');
 await sleep(300);
 assert(await evaluate(cdp,'document.querySelector(".mobi-store-basket-trigger strong")?.textContent==="1"'),"Cart count incorrect");
 assert(await evaluate(cdp,'!document.querySelector(".mobi-store-basket-panel")'),"Basket must not cover page after adding");
 assert(await evaluate(cdp,'Boolean(document.querySelector(".mobi-store-added-feedback"))'),"Inline basket confirmation missing");
 await evaluate(cdp,'document.querySelector(".mobi-store-added-feedback button").click();true');
 assert(await evaluate(cdp,'Boolean(document.querySelector(".mobi-store-basket-panel"))'),"View basket failed");
 await evaluate(cdp,'document.querySelector(".mobi-store-inquiry-prepare").click();true');
 await sleep(200);
 assert(await evaluate(cdp,'document.querySelector(".mobi-store-inquiry-preview")?.textContent.includes("No order") || document.querySelector(".mobi-store-inquiry-preview")?.textContent.includes("لم يتم")'),"Inquiry disclaimer missing");
 await evaluate(cdp,'Object.defineProperty(navigator,"clipboard",{value:{writeText:async text=>{window.__lastCopiedInquiry=text;}},configurable:true});true');
 await evaluate(cdp,'document.querySelector(".mobi-store-inquiry-copy").click();true');
 await sleep(300);
 assert(await evaluate(cdp,'Boolean(window.__lastCopiedInquiry?.includes("TechZone"))'),"B copy inquiry failed");
 assert(await evaluate(cdp,'document.querySelector(".mobi-store-inquiry-preview [role=status]")?.textContent.length>0'),"Copy confirmation missing");
 await evaluate(cdp,'[...document.querySelectorAll("nextjs-portal")].forEach(e=>e.style.display="none");true');
 await capture(cdp,"b-inquiry-desktop");
 await evaluate(cdp,'document.querySelector(".mobi-store-basket-clear").click();true');
 await sleep(200);
 assert(await evaluate(cdp,'document.querySelector(".mobi-store-basket-trigger strong")?.textContent==="0"'),"Clear cart failed");
 assert(await evaluate(cdp,'!document.querySelector(".mobi-store-inquiry-preview")'),"Stale inquiry remains after clearing");
 await evaluate(cdp,'document.querySelector(".mobi-store-basket-title button").click();true');
 await evaluate(cdp,'document.querySelector(".mobi-store-contact-shortcut").click();true');
 await sleep(600);
 assert(await evaluate(cdp,'document.getElementById("store-contact").getBoundingClientRect().top < window.innerHeight'),"Contact shortcut failed");
 await navigate(cdp,base+"/store-preview",390,844);
 const mobile=await evaluate(cdp,'({width:document.documentElement.scrollWidth,viewport:window.innerWidth})');
 await evaluate(cdp,'[...document.querySelectorAll("nextjs-portal")].forEach(e=>e.style.display="none");true');
 await capture(cdp,"b-showcase-mobile");
 assert(mobile.width<=mobile.viewport,"B mobile horizontal overflow "+JSON.stringify(mobile));
 await evaluate(cdp,'document.querySelector(".mobi-store-add").click();true');
 await sleep(200);
 assert(await evaluate(cdp,'!document.querySelector(".mobi-store-basket-panel")'),"Mobile basket must not open automatically");
 await evaluate(cdp,'document.querySelector(".mobi-store-added-feedback button").click();true');
 await evaluate(cdp,'document.querySelector(".mobi-store-inquiry-prepare").click();true');
 await sleep(200);
 assert(await evaluate(cdp,'Boolean(document.querySelector(".mobi-store-inquiry-preview"))'),"Mobile summary unavailable");
 await evaluate(cdp,'[...document.querySelectorAll("nextjs-portal")].forEach(e=>e.style.display="none");true');
 await capture(cdp,"b-inquiry-mobile");
 await evaluate(cdp,'document.querySelector(".mobi-store-basket-title button").click();true');
 await evaluate(cdp,'document.querySelector(".mobi-store-lang").click();true');
 await sleep(300);
 assert(await evaluate(cdp,'document.querySelector(".mobi-store")?.lang==="en"'),"English switch failed");
 await evaluate(cdp,'document.querySelector(".mobi-store-showcase-single").click();true');
 await sleep(220);
 assert(await evaluate(cdp,'document.querySelectorAll(".mobi-store-product").length===1'),"Selecting a showcased phone must show the corresponding product");
 await navigate(cdp,base+"/product/ar",1440,900);
 assert(await evaluate(cdp,'document.querySelector(".mobi-a-repair-image img")?.getAttribute("src")==="/demo/abc/repair-service.webp"'),"A repair photo does not match its service section");
 await evaluate(cdp,'[...document.querySelectorAll("nextjs-portal")].forEach(e=>e.style.display="none");true');
 await capture(cdp,"a-retail-and-repair-desktop");
 ws.close();
 await writeFile(outputDir+"/b-customer-journey-result.json",JSON.stringify({status:"PASS",mobile,imageRoles,productPhotos,scenarios:["phone-image-model match","showcase-to-catalog","repair image role A/B","retail scene B","add to cart","prepare sample inquiry","copy summary","clear","contact shortcut","mobile 390","English"]},null,2)+"\n");
 console.log("B_CUSTOMER_JOURNEY_PASS",JSON.stringify({mobile,scenarios:11}));
}finally{chromeProcess.kill("SIGTERM");}
