import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.APP_ORIGIN || "http://127.0.0.1:3185";
const chrome = process.env.CHROME_BIN;
const secret = "LOCAL_UAT_VISUAL_ONLY";
const outputDir = "C:/A1Hub/a1-mobi/versions/C-LIVE-02";

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
  const response = await fetch("http://127.0.0.1:9224/json/new?" + encodeURIComponent(url), { method: "PUT" });
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

async function navigate(cdp,url,width,height){
  await cdp.send("Emulation.setDeviceMetricsOverride",{
    width,height,deviceScaleFactor:1,mobile:false,
  });
  await cdp.send("Page.navigate",{url});
  for(let i=0;i<150;i++){
    try{
      const ready=await evaluate(cdp,"document.readyState !== 'loading'");
      if(ready)return;
    }catch{}
    await sleep(200);
  }
  throw new Error("Timed out waiting for browser DOM: "+url);
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


const credentials = {};
for(const line of readFileSync("C:/A1Hub/a1-mobi/.local/techzone-owner-login.txt","utf8").split(/\r?\n/)){
 const i=line.indexOf(":");
 if(i>0)credentials[line.slice(0,i).trim()]=line.slice(i+1).trim();
}
const origin="http://127.0.0.1:3198";
const login=await fetch(origin+"/api/auth/login",{
 method:"POST",headers:{"content-type":"application/json","origin":origin},
 body:JSON.stringify({tenant:credentials["Tenant / Store ID"],email:credentials.Email,password:credentials.Password}),
});
if(!login.ok)throw Error("UAT_LOGIN_FAILED_"+login.status);
const cookies=login.headers.getSetCookie().map(x=>x.split(";")[0]).filter(Boolean);
assert(cookies.length>0,"UAT session cookie missing");
const chromeProcess=spawn(chrome,[
 "--headless","--no-sandbox","--disable-gpu","--remote-debugging-port=9224",
 "--user-data-dir=C:/A1Hub/a1-mobi/versions/C-LIVE-02/chrome-uat-visual-pass02",
 "--no-first-run","--no-default-browser-check","about:blank",
],{stdio:["ignore","ignore","ignore"]});
try{
 await waitFor("http://127.0.0.1:9224/json/version");
 const {cdp,ws}=await createCdpTarget("about:blank");
 for(const item of cookies){
  const ix=item.indexOf("=");
  if(ix>0){
    const result=await cdp.send("Network.setCookie",{name:item.slice(0,ix),value:item.slice(ix+1),url:origin});
    assert(result.success!==false,"Local UAT session cookie rejected by Chrome");
  }
 }
 const address=origin+"/ar/live-02";
 await navigate(cdp,address,1440,900);
 for(let i=0;i<80;i++){
  if(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody tr").length===4'))break;
  await sleep(200);
 }
 // The isolated Next dev server can briefly report SERVICE_UNAVAILABLE during rebuild.
 // Recover using the same Refresh button the store owner has, never fabricate state.
 if(!(await evaluate(cdp,'document.querySelector(".mobi-live02-stats strong")?.textContent==="4"'))){
   await evaluate(cdp,'document.querySelector(".module-header button.soft-btn")?.click();true');
   for(let i=0;i<85;i++){
     if(await evaluate(cdp,'document.querySelector(".mobi-live02-stats strong")?.textContent==="4"'))break;
     await sleep(200);
   }
 }
 const desktop=await evaluate(cdp,'({width:innerWidth,overflow:document.documentElement.scrollWidth,rowCount:document.querySelectorAll(".mobi-live02-orders tbody tr").length,stats:[...document.querySelectorAll(".mobi-live02-stats strong")].map(x=>x.textContent)})');
 const diagnostics=await evaluate(cdp,'(async()=>({path:location.pathname,error:document.querySelector(".mobi-live-message")?.textContent??null,apiStatus:(await fetch("/api/ops/live-02",{cache:"no-store"})).status}))()');
 console.log("UAT_BROWSER_SCOPE",JSON.stringify(diagnostics));
 assert(desktop.rowCount===4,"Expected exactly four persisted UAT records "+JSON.stringify(desktop));
 assert(desktop.overflow<=desktop.width+2,"Desktop horizontal overflow");
 assert(desktop.stats[0]==="4","Real summary count should match 4");
 assert(desktop.stats[3].includes('120.00'), 'Receivable KPI must exclude provisional repair estimates');
 await capture(cdp,"c-live-02-owner-real-table-desktop");
 await evaluate(cdp,'document.querySelector(".mobi-live02-orders").scrollIntoView({block:"start"});true');
 await sleep(300);
 await capture(cdp,"c-live-02-owner-repair-table-desktop");
 await evaluate(cdp,'(() =>{const x=document.querySelector(".mobi-live02-filters input");const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;set.call(x,"Customer B");x.dispatchEvent(new Event("input",{bubbles:true}));return true})()');
 await sleep(200);
 const searched=await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody tr").length===1 && document.querySelector(".mobi-live02-orders tbody").innerText.includes("Customer B")');
 assert(searched,"Search did not narrow UAT table");
 await capture(cdp,"c-live-02-owner-search");
 await evaluate(cdp,'(() =>{const x=document.querySelector(".mobi-live02-filters input");const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;set.call(x,"");x.dispatchEvent(new Event("input",{bubbles:true}));const y=document.querySelector(".mobi-live02-filters select");const setSel=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set;setSel.call(y,"READY");y.dispatchEvent(new Event("change",{bubbles:true}));return true})()');
 await sleep(200);
 const filtered=await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody tr").length===1 && document.querySelector(".mobi-live02-orders tbody").innerText.includes("جاهز")');
 assert(filtered,"READY filter failed");
 await capture(cdp,"c-live-02-owner-ready-filter");
 await navigate(cdp,address,390,844);
 for(let i=0;i<80;i++){
  if(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody tr").length===4'))break;
  await sleep(200);
 }
 const mobile=await evaluate(cdp,'({width:innerWidth,overflow:document.documentElement.scrollWidth,rowCount:document.querySelectorAll(".mobi-live02-orders tbody tr").length})');
 assert(mobile.rowCount===4,"Mobile UAT records not rendered");
 assert(mobile.overflow<=mobile.width+2,"Mobile document horizontal overflow");
 const cardMode=await evaluate(cdp,'getComputedStyle(document.querySelector(".mobi-live02-orders tbody")).display==="grid"');
 assert(cardMode,"Mobile repair rows must become readable cards");
 await capture(cdp,"c-live-02-owner-real-table-mobile");
 await evaluate(cdp,'document.querySelector(".mobi-live02-orders").scrollIntoView({block:"start"});true');
 await sleep(300);
 await capture(cdp,"c-live-02-owner-repair-table-mobile");
 console.log("C_LIVE_02_REAL_DATA_VISUAL_PASS",JSON.stringify({desktop,mobile,search:true,readyFilter:true}));
 ws.close();
}finally{
 chromeProcess.kill("SIGTERM");
}
