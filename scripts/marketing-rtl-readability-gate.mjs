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
  const response = await fetch("http://127.0.0.1:9248/json/new?" + encodeURIComponent(url), { method: "PUT" });
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
 "--remote-debugging-port=9248","--user-data-dir=C:/A1Hub/a1-mobi/.local/chrome-marketing-rtl-20261020",
 "about:blank"
],{stdio:["ignore","ignore","ignore"]});
const report={status:"PASS",desktop:[],mobile:[]};
const layoutExpr='(()=>{const rc=selector=>{const e=document.querySelector(selector);if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),right:Math.round(r.right),width:Math.round(r.width)};};const links=[...document.querySelectorAll(".product-main-links>a")];return {doc:document.documentElement.scrollWidth,viewport:innerWidth,logo:rc(".product-nav .product-brand"),footerLogo:rc(".product-footer .footer-brand"),footerColumnsDirection:[...document.querySelectorAll(".product-footer .footer-grid>div:not(.footer-company)")].map(e=>getComputedStyle(e).direction),main:rc(".product-main-links"),switcher:rc(".product-language-switch"),switcherHref:document.querySelector(".product-language-switch")?.getAttribute("href"),cta:rc(".product-nav-actions .product-cta"),direction:document.querySelector(".product-main-links")?.getAttribute("dir"),linkXs:links.map(e=>Math.round(e.getBoundingClientRect().x)),labels:links.map(e=>e.textContent),cardFont:getComputedStyle(document.querySelector(".mobi-a-feature-card p")||document.querySelector(".pricing-card li")||document.querySelector(".signup-panel label")||document.body).fontSize,whyWidth:rc(".mobi-a-why .product-shell"),testimonialWidth:rc(".mobi-a-testimonial")};})()';
const mobileExpr='(()=>{const rc=s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r?{x:Math.round(r.x),right:Math.round(r.right),width:Math.round(r.width)}:null};return {viewport:innerWidth,doc:document.documentElement.scrollWidth,logo:rc(".product-nav .product-brand"),footerLogo:rc(".product-footer .footer-brand"),switcher:rc(".product-language-switch"),menu:rc(".product-mobile-menu summary"),mainDisplay:getComputedStyle(document.querySelector(".product-main-links")).display};})()';
try{
 await waitFor("http://127.0.0.1:9248/json/version",100);
 const {cdp,ws}=await createCdpTarget("about:blank");
 for(const locale of ["ar","en"]){
  for(const page of ["","pricing","signup"]){
   const path="/product/"+locale+(page?"/"+page:"");
   await navigate(cdp,base+path,1440,900);
   const data=await evaluate(cdp,layoutExpr);
   assert(data.doc<=data.viewport,"desktop horizontal overflow "+path+" "+JSON.stringify(data));
   assert(data.logo.x<160&&data.logo.right<420,"logo not left "+path);
   assert(data.footerLogo?.x<160&&Math.abs(data.footerLogo.x-data.logo.x)<45,"footer logo must stay left near header x "+path+" "+JSON.stringify(data));
   assert(data.footerColumnsDirection.every(value=>value===(locale==="ar"?"rtl":"ltr")),"footer text direction mismatch "+path);
   assert(data.switcher.x>data.cta.x&&data.switcher.right>1300,"switch not far right "+path+" "+JSON.stringify(data));
   assert(data.direction===(locale==="ar"?"rtl":"ltr"),"nav direction wrong "+path);
   const expectedOther="/product/"+(locale==="ar"?"en":"ar")+(page?"/"+page:"");
   assert(data.switcherHref===expectedOther,"language switch must preserve current page "+path+" => "+data.switcherHref);
   assert(data.linkXs.length===4,"missing links "+path);
   for(let i=0;i<3;i++){
    assert(locale==="ar"?data.linkXs[i]>data.linkXs[i+1]:data.linkXs[i]<data.linkXs[i+1],"visual nav order wrong "+path+" "+JSON.stringify(data.linkXs));
   }
   report.desktop.push({path,...data});
   await evaluate(cdp,'[...document.querySelectorAll("nextjs-portal")].forEach(e=>e.style.display="none");true');
   await capture(cdp,"marketing-"+locale+"-"+(page||"home")+"-desktop");
   if(!page){
    await evaluate(cdp,'document.querySelector(".product-footer").scrollIntoView({block:"end"});true');
    await sleep(190);
    await capture(cdp,"marketing-"+locale+"-footer-desktop");
   }
  }
  for(const page of ["","signup","pricing"]){
   const path="/product/"+locale+(page?"/"+page:"");
   await navigate(cdp,base+path,390,844);
   const data=await evaluate(cdp,mobileExpr);
   assert(data.doc<=data.viewport,"mobile overflow "+path+" "+JSON.stringify(data));
   assert(data.logo.x<45&&data.switcher.x>data.logo.right&&data.menu,"mobile header missing "+path);
   assert(data.footerLogo?.x<45&&Math.abs(data.footerLogo.x-data.logo.x)<20,"mobile footer logo not physically left "+path+" "+JSON.stringify(data));
   assert(data.mainDisplay==="none","desktop links present on mobile "+path);
   await evaluate(cdp,'[...document.querySelectorAll("nextjs-portal")].forEach(e=>e.style.display="none");true');
   await capture(cdp,"marketing-"+locale+"-"+(page||"home")+"-mobile");
   if(!page){
    await evaluate(cdp,'document.querySelector(".product-footer .footer-company").scrollIntoView({block:"center"});true');
    await sleep(190);
    await capture(cdp,"marketing-"+locale+"-footer-mobile");
   }
   if(!page){
    await evaluate(cdp,'window.scrollTo(0,0);true');
    await sleep(100);
    await evaluate(cdp,'document.querySelector(".product-mobile-menu summary").click();true');
    assert(await evaluate(cdp,'document.querySelector(".product-mobile-menu")?.open===true&&document.querySelectorAll(".product-mobile-menu-items>a").length>=5'),"mobile nav inaccessible");
    await capture(cdp,"marketing-"+locale+"-mobile-menu-open");
   }
   report.mobile.push({path,...data});
  }
 }
 const ar=report.desktop.find(d=>d.path==="/product/ar"),en=report.desktop.find(d=>d.path==="/product/en");
 assert(Math.abs(ar.logo.x-en.logo.x)<=2,"logo shifted with language");
 assert(Math.abs(ar.switcher.x-en.switcher.x)<120,"language toggle shifts excessively");
 assert(ar.whyWidth?.width>1270&&ar.testimonialWidth?.width>1270,"lower sections too narrow");
 assert(Number.parseFloat(ar.cardFont)>=14,"feature card text too small");
 const pricing=report.desktop.find(d=>d.path==="/product/ar/pricing");
 assert(Number.parseFloat(pricing.cardFont)>=14,"pricing font too small");
 await writeFile(outputDir+"/marketing-rtl-readability-result.json",JSON.stringify(report,null,2)+"\n");
 console.log("MARKETING_RTL_READABILITY_PASS",JSON.stringify({desktop:report.desktop.length,mobile:report.mobile.length,logoX:ar.logo.x,whyWidth:ar.whyWidth.width,cardFont:ar.cardFont,switcherX:ar.switcher.x}));
 ws.close();
}finally{chromeProcess.kill("SIGTERM");}
