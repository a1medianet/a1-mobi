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
  const response = await fetch("http://127.0.0.1:9234/json/new?" + encodeURIComponent(url), { method: "PUT" });
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
 "--headless","--no-sandbox","--disable-gpu","--remote-debugging-port=9234",
 "--user-data-dir=C:/A1Hub/a1-mobi/versions/C-LIVE-02/chrome-uat-kpi-pass05",
 "--no-first-run","--no-default-browser-check","about:blank",
],{stdio:["ignore","ignore","ignore"]});
try{
 await waitFor("http://127.0.0.1:9234/json/version");
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
 // Dev builds may transiently return 503 while compiling. Require genuine DOM state.
 for(let attempt=0;attempt<4;attempt++){
  for(let i=0;i<42;i++){
   if(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody tr .mobi-live02-open").length>=5'))break;
   await sleep(200);
  }
  if(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody tr .mobi-live02-open").length>=5'))break;
  const refreshed=await evaluate(cdp,'(() =>{const button=document.querySelector(".module-header button.soft-btn");if(!button||button.disabled)return false;button.click();return true;})()');
  if(!refreshed)await navigate(cdp,address,1440,900);
 }
 assert(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody tr .mobi-live02-open").length>=5'),"UAT repair list unavailable after retries");
 // Wait for branch-global KPI rather than assuming a fixed number of test records.
 const serverOverview=await evaluate(cdp,'(async()=>{const r=await fetch("/api/ops/live-02",{cache:"no-store"});return (await r.json()).overview;})()');
 assert(serverOverview && serverOverview.total>=6,"Global branch metrics unavailable");
 for(let i=0;i<90;i++){
  if(await evaluate(cdp,'Number(document.querySelector(".mobi-live02-stats strong")?.textContent)==='+String(serverOverview.total)))break;
  await sleep(200);
 }
 const desktop=await evaluate(cdp,'({width:innerWidth,overflow:document.documentElement.scrollWidth,rowCount:document.querySelectorAll(".mobi-live02-orders tbody tr").length,stats:[...document.querySelectorAll(".mobi-live02-stats strong")].map(x=>x.textContent)})');
 const diagnostics=await evaluate(cdp,'(async()=>({path:location.pathname,error:document.querySelector(".mobi-live-message")?.textContent??null,apiStatus:(await fetch("/api/ops/live-02",{cache:"no-store"})).status}))()');
 console.log("UAT_BROWSER_SCOPE",JSON.stringify(diagnostics));
 assert(desktop.rowCount>=5,"Expected five or more persisted UAT records "+JSON.stringify(desktop));
 assert(desktop.overflow<=desktop.width+2,"Desktop horizontal overflow");
 assert(Number(desktop.stats[0])===serverOverview.total,"Owner branch totals must be global");
 assert(Number(desktop.stats[1])===serverOverview.active,"Active count must be global");
 assert(Number(desktop.stats[2])===serverOverview.ready,"Ready count must be global");
 assert(Math.abs(Number(desktop.stats[3].replace(/[^0-9.]/g,""))-serverOverview.balanceDue)<0.001,"Ready due must be global");
 assert(serverOverview.balanceDue>=0,"Cash receivables cannot be negative");
 await capture(cdp,"c-live-02-vp05-compact-desktop");
 await evaluate(cdp,'document.querySelector(".mobi-live02-orders").scrollIntoView({block:"start"});true');
 await sleep(300);
 await capture(cdp,"c-live-02-vp05-table-desktop");
 const historyApi=await evaluate(cdp,'(async()=>{const r=await fetch("/api/ops/live-02?q="+encodeURIComponent("UAT-FIN-03"),{cache:"no-store"});const j=await r.json();return {status:r.status,matched:j.matchedCount,items:j.orders?.length,customer:j.orders?.[0]?.customerName};})()');
 assert(historyApi.status===200&&historyApi.matched===1&&historyApi.items===1,"Archived search API failed "+JSON.stringify(historyApi));
 console.log("C_LIVE_02_VP05_SERVER_SEARCH_UI_PASS",JSON.stringify(historyApi));


 const rowForms=await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody form").length');
 assert(rowForms===0,"Repair action forms must be separated from table rows");
 const selectedClick=await evaluate(cdp,'(() => {const row=[...document.querySelectorAll(".mobi-live02-orders tbody tr")].find(row=>row.querySelector(".mobi-live02-status-ready"));if(!row)return false;row.querySelector(".mobi-live02-open")?.click();return true;})()');
 assert(selectedClick,"A READY ticket should have an Open button");
 for(let i=0;i<55;i++){if(await evaluate(cdp,'Boolean(document.querySelector(".mobi-live02-case-detail .mobi-live02-settlement form"))'))break;await sleep(150);}
 assert(await evaluate(cdp,'Boolean(document.querySelector(".mobi-live02-case-detail .mobi-live02-settlement form"))'),"Cash form must appear only inside the selected detail panel");
 assert(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody form").length===0'),"Cash form leaked into repair list table");
 await capture(cdp,"c-live-02-vp05-desktop-opened-case");
 await evaluate(cdp,'document.querySelector(".mobi-live02-case-detail button.mobi-live02-close").click();true');
 assert(!(await evaluate(cdp,'Boolean(document.querySelector(".mobi-live02-case-detail"))')),"Closing details should hide panel without changing a ticket");

 await evaluate(cdp,'(() =>{const x=document.querySelector(".mobi-live02-filters input");const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;set.call(x,"Customer B");x.dispatchEvent(new Event("input",{bubbles:true}));return true})()');
 for(let i=0;i<65;i++){
   if(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody tr").length===1 && document.querySelector(".mobi-live02-orders tbody")?.innerText.includes("Customer B")'))break;
   await sleep(220);
 }
 const searched=await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody tr").length===1 && document.querySelector(".mobi-live02-orders tbody").innerText.includes("Customer B")');
 assert(searched,"Search did not narrow UAT table");
 const searchedKpi=await evaluate(cdp,'[...document.querySelectorAll(".mobi-live02-stats strong")].map(x=>x.textContent)');
 assert(searchedKpi.join("|")===desktop.stats.join("|"),"Search must not change global branch KPIs");
 await capture(cdp,"c-live-02-vp05-owner-search");
 await evaluate(cdp,'(() =>{const x=document.querySelector(".mobi-live02-filters input");const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;set.call(x,"");x.dispatchEvent(new Event("input",{bubbles:true}));const y=document.querySelector(".mobi-live02-filters select");const setSel=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set;setSel.call(y,"READY");y.dispatchEvent(new Event("change",{bubbles:true}));return true})()');
 for(let i=0;i<65;i++){
   if(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody tr").length===1 && document.querySelector(".mobi-live02-orders tbody")?.innerText.includes("جاهز")'))break;
   await sleep(220);
 }
 const filtered=await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody tr").length===1 && document.querySelector(".mobi-live02-orders tbody").innerText.includes("جاهز")');
 assert(filtered,"READY filter failed");
 const filteredKpi=await evaluate(cdp,'[...document.querySelectorAll(".mobi-live02-stats strong")].map(x=>x.textContent)');
 assert(filteredKpi.join("|")===desktop.stats.join("|"),"READY filter must not change global branch KPIs");
 await capture(cdp,"c-live-02-vp05-owner-ready-filter");
 await navigate(cdp,address,390,844);
 for(let i=0;i<80;i++){
  if(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody tr").length>=5'))break;
  await sleep(200);
 }
 const mobile=await evaluate(cdp,'({width:innerWidth,overflow:document.documentElement.scrollWidth,rowCount:document.querySelectorAll(".mobi-live02-orders tbody tr").length})');
 assert(mobile.rowCount>=5,"Mobile UAT records not rendered");
 assert(mobile.overflow<=mobile.width+2,"Mobile document horizontal overflow");
 const cardMode=await evaluate(cdp,'getComputedStyle(document.querySelector(".mobi-live02-orders tbody")).display==="grid"');
 assert(cardMode,"Mobile repair rows must become readable cards");
 await capture(cdp,"c-live-02-vp05-compact-mobile");
 await evaluate(cdp,'document.querySelector(".mobi-live02-orders").scrollIntoView({block:"start"});true');
 await sleep(300);
 await capture(cdp,"c-live-02-vp05-table-mobile");

 const mobileButton=await evaluate(cdp,'(() => {const ready=[...document.querySelectorAll(".mobi-live02-orders tbody tr")].find(row=>row.querySelector(".mobi-live02-status-ready"));if(!ready)return false;ready.querySelector(".mobi-live02-open")?.click();return true;})()');
 assert(mobileButton,"Mobile READY card not clickable");
 for(let i=0;i<60;i++){if(await evaluate(cdp,'Boolean(document.querySelector(".mobi-live02-case-detail .mobi-live02-settlement form"))'))break;await sleep(150);}
 assert(await evaluate(cdp,'Boolean(document.querySelector(".mobi-live02-case-detail .mobi-live02-settlement form"))'),"Mobile case panel missing settlement form");
 const mobileSelected=await evaluate(cdp,'({width:innerWidth,overflow:document.documentElement.scrollWidth,inlineForms:document.querySelectorAll(".mobi-live02-orders tbody form").length})');
 assert(mobileSelected.inlineForms===0 && mobileSelected.overflow<=mobileSelected.width+2,"Mobile selected case overflow or inline form "+JSON.stringify(mobileSelected));
 await capture(cdp,"c-live-02-vp05-mobile-opened-case");
 console.log("C_LIVE_02_VP05_CASE_PANEL_PASS",JSON.stringify({desktopRows:desktop.rowCount,mobileRows:mobile.rowCount,tableForms:rowForms,mobileSelected}));

 console.log("C_LIVE_02_VP05_BRANCH_KPI_VISUAL_PASS",JSON.stringify({desktop,mobile,search:true,readyFilter:true}));
 ws.close();
}finally{
 chromeProcess.kill("SIGTERM");
}
