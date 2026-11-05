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
  const response = await fetch("http://127.0.0.1:9228/json/new?" + encodeURIComponent(url), { method: "PUT" });
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

const dbLine=readFileSync("C:/A1Hub/a1-mobi/.env.local","utf8")
  .split(/\r?\n/).find(x=>x.startsWith("DATABASE_URL="));
if(!dbLine)throw Error("LOCAL_UAT_DB_MISSING");
const dbUri=new URL(dbLine.slice(13).replace(/^postgresql:/,"http:"));
if(dbUri.hostname!=="127.0.0.1"||dbUri.pathname!=="/mobi_uat")throw Error("NOT_ISOLATED_UAT");
if(process.env.A1_MOBI_FIN_UAT_ALLOWED!=="1")throw Error("FIN_UAT_DISABLED");
const cookieHeader=cookies.join("; ");
async function getState(){
 const r=await fetch(origin+"/api/ops/live-02",{headers:{cookie:cookieHeader},cache:"no-store"});
 if(!r.ok)throw Error("REPAIR_READ_"+r.status);
 return r.json();
}
async function post(data){
 const r=await fetch(origin+"/api/ops/live-02",{method:"POST",headers:{
  cookie:cookieHeader,"content-type":"application/json",origin,
 },body:JSON.stringify(data)});
 const result=await r.json();
 if(!r.ok)throw Error("FIN_UAT_STEP_"+data.action+"_"+r.status+"_"+String(result.error||""));
 return result;
}
function imeiFrom14(base){
 let sum=0;
 for(let i=0;i<base.length;i++){
   let digit=Number(base[i]);if(i%2===1){digit*=2;if(digit>9)digit-=9;}sum+=digit;
 }
 return base+String((10-sum%10)%10);
}
const markerName="[UAT-FIN-03] Selected Workspace Settlement";
let state=await getState();
let order=state.orders.find(x=>x.customerName===markerName);
if(!order){
 const create=await post({action:"intake",customerName:markerName,
   customerPhone:"+96170009999",deviceDescription:"UAT Test OnePlus Device",
   condition:"Synthetic UAT intact",reportedIssue:"UAT repair payment journey",
   imei:imeiFrom14("86000000100124"),accessories:[]});
 await post({action:"estimate",repairId:create.id,diagnosis:"UAT connector replacement",estimateAmount:90});
 await post({action:"approve",repairId:create.id});
 await post({action:"start",repairId:create.id});
 await post({action:"ready",repairId:create.id,finalPrice:90,laborCost:20,directCost:10});
 state=await getState();
 order=state.orders.find(x=>x.id===create.id);
}
assert(order && (order.status==="READY"||order.status==="DELIVERED"),"Financial UAT repair missing");
if(order.status==="DELIVERED"){
 assert(order.warranty?.number&&order.balanceDue===0,"Previously delivered test lacks proof");
 console.log("C_LIVE_02_ALREADY_DELIVERED_UAT",JSON.stringify({warranty:true,zeroDue:true}));
 process.exit(0);
}
const repairId=order.id;
const chromeProcess=spawn(chrome,[
 "--headless","--no-sandbox","--disable-gpu","--remote-debugging-port=9228",
 "--user-data-dir=C:/A1Hub/a1-mobi/versions/C-LIVE-02/chrome-fin-uat-vp03-cdp",
 "--no-first-run","--no-default-browser-check","about:blank",
],{stdio:["ignore","ignore","ignore"]});
try{
 await waitFor("http://127.0.0.1:9228/json/version");
 const {cdp,ws}=await createCdpTarget("about:blank");
 for(const item of cookies){
  const ix=item.indexOf("=");
  if(ix>0)await cdp.send("Network.setCookie",{name:item.slice(0,ix),value:item.slice(ix+1),url:origin});
 }
 const ownerUrl=origin+"/ar/live-02";
 await navigate(cdp,ownerUrl,1440,900);
 const sleepMore=()=>sleep(250);
 async function waitUntil(expression){
  for(let i=0;i<100;i++){if(await evaluate(cdp,expression))return;await sleep(220);}
  throw Error("FIN_UI_TIMEOUT_"+expression);
 }
 const rowFn='[...document.querySelectorAll(".mobi-live02-orders tbody tr")].find(x=>x.textContent.includes('+JSON.stringify(markerName)+'))';
 for(let attempt=0;attempt<3;attempt++){
   for(let i=0;i<45;i++){
     if(await evaluate(cdp,'Boolean('+rowFn+')'))break;
     await sleep(220);
   }
   if(await evaluate(cdp,'Boolean('+rowFn+')'))break;
   await evaluate(cdp,'document.querySelector(".module-header button.soft-btn")?.click();true');
 }
 if(!(await evaluate(cdp,'Boolean('+rowFn+')'))){
  const diag=await evaluate(cdp,'(async()=>({path:location.pathname,error:document.querySelector(".mobi-live-message")?.textContent??null,status:(await fetch("/api/ops/live-02",{cache:"no-store"})).status,rows:document.querySelectorAll(".mobi-live02-orders tbody tr").length}))()');
  console.log("FIN_OWNER_SESSION_SCOPE",JSON.stringify(diag));
  throw Error("FIN_UI_REPAIR_NOT_RENDERED");
 }
 await evaluate(cdp,'window.confirm=()=>true;true');
 await evaluate(cdp,'(() => {const row=' + rowFn + ';row.querySelector(".mobi-live02-open")?.click();return true;})()');
 for(let i=0;i<70;i++){if(await evaluate(cdp,'Boolean(document.querySelector(".mobi-live02-case-detail .mobi-live02-settlement form"))'))break;await sleep(200);}
 assert(await evaluate(cdp,'Boolean(document.querySelector(".mobi-live02-case-detail .mobi-live02-settlement form"))'),"Selected case payment form not visible");
 assert(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody form").length===0'),"Payment form embedded inside a list row");
 if(!state.cashOpen){
  await evaluate(cdp,'document.querySelector(".mobi-live02-cash summary").click();true');
  await sleepMore();
  await evaluate(cdp,'(() => {const el=document.querySelectorAll(".mobi-live02-cash form input")[2];const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;set.call(el,"90000");el.dispatchEvent(new Event("input",{bubbles:true}));return true;})()');
  await sleepMore();
  await evaluate(cdp,'document.querySelector(".mobi-live02-cash form").requestSubmit();true');
  for(let i=0;i<85;i++){const s=await getState();if(s.cashOpen)break;await sleep(200);}
  assert((await getState()).cashOpen,"Browser failed to open UAT cash drawer");
 }
 async function payFromBrowser(amount,targetPaid){
  const js='(() => {const row='+rowFn+';const el=document.querySelector(".mobi-live02-case-detail .mobi-live02-settlement input[type=number]");const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;set.call(el,'+JSON.stringify(String(amount))+');el.dispatchEvent(new Event("input",{bubbles:true}));return true;})()';
  await evaluate(cdp,js);
  await sleepMore();
  await evaluate(cdp,'(() => {const row='+rowFn+';document.querySelector(".mobi-live02-case-detail .mobi-live02-settlement form").requestSubmit();return true;})()');
  let latest=null;
  for(let i=0;i<85;i++){
   const state=await getState();
   latest=state.orders.find(x=>x.id===repairId);
   if(latest && latest.paidTotal===targetPaid)return latest;
   await sleep(200);
  }
  throw Error("Browser payment was not persisted, last paid="+latest?.paidTotal);
 }
 await payFromBrowser(30,30);
 await capture(cdp,"c-live-02-vp03-financial-partial-payment");
 await waitUntil('document.querySelector(".mobi-live02-case-detail")?.textContent.includes("60.00")');
 await payFromBrowser(60,90);
 await waitUntil('document.querySelector(".mobi-live02-case-detail")?.textContent.includes("تم تسديد القيمة")');
 await capture(cdp,"c-live-02-vp03-financial-paid-in-full");
 await evaluate(cdp,'(() => {const row='+rowFn+';const form=document.querySelector(".mobi-live02-case-detail .mobi-live02-settlement form");const input=form.querySelectorAll("input")[1];const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;set.call(input,"UAT parts warranty for 30 days");input.dispatchEvent(new Event("input",{bubbles:true}));form.querySelector("input[type=checkbox]").click();return true;})()');
 await sleepMore();
 await evaluate(cdp,'(() => {const row='+rowFn+';document.querySelector(".mobi-live02-case-detail .mobi-live02-settlement form").requestSubmit();return true;})()');
 for(let i=0;i<85;i++){
  const state=await getState();
  const delivered=state.orders.find(x=>x.id===repairId);
  if(delivered?.status==="DELIVERED"&&delivered.warranty?.number)break;
  await sleep(200);
 }
 const delivered=(await getState()).orders.find(x=>x.id===repairId);
 assert(delivered?.status==="DELIVERED" && delivered.balanceDue===0 && delivered.warranty?.number,"UAT delivery/warranty not persisted");
 await navigate(cdp,ownerUrl,1440,900);
 await waitUntil('('+rowFn+')?.textContent.includes("تم التسليم")');
 await evaluate(cdp,'(() => {const row=' + rowFn + ';row.querySelector(".mobi-live02-open")?.click();return true;})()');
 await waitUntil('document.querySelector(".mobi-live02-case-detail .mobi-live02-settlement")?.textContent.includes("الضمان")');
 assert(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody form").length===0'),"Delivered state leaked row form");
 await evaluate(cdp,'document.querySelector(".mobi-live02-orders").scrollIntoView({block:"start"});true');
 await sleepMore();
 await capture(cdp,"c-live-02-vp03-financial-delivered-warranty");
 console.log("C_LIVE_02_VP03_FINANCIAL_BROWSER_E2E_PASS",JSON.stringify({
  openingCash:true,partialCash:30,finalCash:60,paidTotal:90,balanceDue:0,
  delivered:true,warranty:true,persistedAfterReload:true,
 }));
 ws.close();
}finally{
 chromeProcess.kill("SIGTERM");
}
