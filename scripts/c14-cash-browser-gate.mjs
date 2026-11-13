// C-14/01: real browser + PostgreSQL UAT, isolated fixture, evidence only in this repository.
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const db = new PrismaClient();
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3218";
const uat = new URL(process.env.DATABASE_URL || "postgresql://invalid/none");
if (uat.hostname !== "127.0.0.1" || uat.port !== "5438" || uat.pathname !== "/mobi_uat")
  throw new Error("UAT_DATABASE_ONLY");
if (!base.startsWith("http://127.0.0.1:")) throw new Error("LOCAL_BROWSER_ONLY");
const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const root = process.cwd();
const output = path.join(root, "docs", "reviews", "2026-10-19", "c14");
const profile = path.join(root, ".local", "c14-chrome-" + process.pid);
const port = 9338;
const id = randomUUID().slice(0, 12);
const pass = "C14Browser-" + randomUUID() + "-Strong!";
const tenantSlug = "c14-browser-" + id;
const email = "c14-" + id + "@example.test";
let tenant, branch, actor, role, cashSession, browser, socket, cdp;
const sleep = ms => new Promise(r => setTimeout(r, ms));
function must(value, name) { if (!value) throw Error(name); }
class Cdp {
  constructor(ws) {
    this.ws = ws; this.next = 0; this.pending = new Map();
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (!m.id) return;
      const slot = this.pending.get(m.id);
      if (!slot) return;
      this.pending.delete(m.id);
      if (m.error) slot.reject(Error(m.error.message)); else slot.resolve(m.result || {});
    };
  }
  send(method, params={}) {
    const id = ++this.next;
    return new Promise((resolve,reject) => {
      this.pending.set(id,{resolve,reject});
      this.ws.send(JSON.stringify({id,method,params}));
    });
  }
  async eval(expression) {
    const r = await this.send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails) throw Error("BROWSER_EVALUATION_ERROR: " + expression.slice(0,90));
    return r.result?.value;
  }
}
async function waitFor(url) {
  for(let i=0;i<100;i++) {
    try { const r=await fetch(url); if(r.ok) return r; } catch {}
    await sleep(150);
  }
  throw Error("NOT_READY: " + url);
}
async function viewport(width,height,mobile) {
  await cdp.send("Emulation.setDeviceMetricsOverride",{width,height,screenWidth:width,screenHeight:height,deviceScaleFactor:1,mobile});
  await cdp.send("Page.navigate",{url:base+"/ar/cash"});
  for(let i=0;i<100;i++) {
    await sleep(250);
    if(await cdp.eval('document.readyState==="complete" && !!document.querySelector(".cash-close-panel")')) return;
    const body=await cdp.eval('document.body?.innerText?.slice(0,150)||""');
    if(body.includes("Application error")) throw Error("NEXT_CLIENT_ERROR:"+body);
  }
  const failure=await cdp.eval('JSON.stringify({url:location.href,text:document.body?.innerText?.slice(0,240),html:document.documentElement?.outerHTML?.slice(0,160)})');
  throw Error("CASH_UI_NOT_RENDERED:"+failure);
}
async function shot(name) {
  const img=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
  await writeFile(path.join(output,name+".png"),Buffer.from(img.data,"base64"));
}
async function setValue(selector,value) {
  return cdp.eval('(() => { const el=document.querySelector('+JSON.stringify(selector)+'); if(!el)return false;'
    +' const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;'
    +' setter.call(el,'+JSON.stringify(value)+');'
    +' el.dispatchEvent(new Event("input",{bubbles:true}));'
    +' el.dispatchEvent(new Event("change",{bubbles:true}));return true; })()');
}
try {
  await mkdir(output,{recursive:true});
  tenant=await db.tenant.create({data:{slug:tenantSlug,name:"C14 Browser UAT only"}});
  branch=await db.branch.create({data:{tenantId:tenant.id,code:"MAIN",name:"C14 test branch"}});
  actor=await db.user.create({data:{tenantId:tenant.id,branchId:branch.id,email,displayName:"C14 Test Owner",passwordHash:await argon2.hash(pass,{type:argon2.argon2id})}});
  const p=await db.permission.upsert({where:{code:"cash.manage"},create:{code:"cash.manage",description:"Manage cash drawer"},update:{}});
  role=await db.role.create({data:{tenantId:tenant.id,code:"C14_BROWSER_OWNER",name:"C14 owner role"}});
  await db.rolePermission.create({data:{roleId:role.id,permissionId:p.id}});
  await db.userRole.create({data:{userId:actor.id,roleId:role.id}});
  cashSession=await db.cashSession.create({data:{tenantId:tenant.id,branchId:branch.id,openedById:actor.id,openingUsd:100,openingLbp:8950000,openingExchangeRate:89500}});
  const login=await fetch(base+"/api/auth/login",{method:"POST",headers:{"content-type":"application/json",origin:base},
    body:JSON.stringify({tenant:tenantSlug,email,password:pass})});
  must(login.status===200,"LOGIN_"+login.status+"_"+(await login.text()).slice(0,100));
  const rawCookie=login.headers.get("set-cookie")?.split(";")[0];
  must(rawCookie,"LOGIN_COOKIE_MISSING");
  const sep=rawCookie.indexOf("=");
  const name=rawCookie.slice(0,sep), value=rawCookie.slice(sep+1);
  browser=spawn(chrome,["--headless=new","--disable-gpu","--no-first-run","--no-default-browser-check",
    "--remote-debugging-port="+port,"--user-data-dir="+profile,"about:blank"],{stdio:"ignore"});
  await waitFor("http://127.0.0.1:"+port+"/json/version");
  const target=await (await fetch("http://127.0.0.1:"+port+"/json/new?about:blank",{method:"PUT"})).json();
  socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  cdp=new Cdp(socket);
  await cdp.send("Page.enable");await cdp.send("Runtime.enable");await cdp.send("Network.enable");
  const ck=await cdp.send("Network.setCookie",{name,value,url:base,path:"/",httpOnly:true,secure:name.startsWith("__Host-"),sameSite:"Lax"});
  must(ck.success,"BROWSER_COOKIE_REJECTED");
  await viewport(1440,900,false);
  must(await cdp.eval('document.querySelectorAll(".metrics .metric").length===4'),"DESKTOP_METRICS_MISSING");
  must(await cdp.eval('document.querySelector(".cash-close-panel")?.textContent.includes("إغلاق الصندوق")'),"CLOSE_UI_MISSING");
  must(await cdp.eval('document.contentType==="text/html"'),"RSC_INSTEAD_OF_HTML");
  await shot("cash-desktop-auth");
  await viewport(390,844,true);
  must(await cdp.eval('document.querySelectorAll(".metrics .metric").length===4'),"MOBILE_METRICS_MISSING");
  const mobile=await cdp.eval('({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth})');
  must(mobile.scrollWidth <= mobile.clientWidth + 2,"MOBILE_OVERFLOW:"+JSON.stringify(mobile));
  await shot("cash-mobile-auth"); await sleep(3000);
  must(await setValue('.cash-close-fields input:nth-of-type(1)',"100") || await setValue('.cash-close-fields label:nth-child(1) input',"100"),"USD_INPUT");
  must(await setValue('.cash-close-fields label:nth-child(2) input',"8950000"),"LBP_INPUT");
  must(await setValue('.cash-close-fields label:nth-child(3) input',"89500"),"RATE_INPUT");
  await sleep(250);
  must(await cdp.eval('!!document.querySelector(".cash-close-panel button.primary") && !document.querySelector(".cash-close-panel button.primary").disabled'),"PREVIEW_BUTTON_DISABLED");
  await cdp.eval('document.querySelector(".cash-close-panel button.primary").click()');
  let preview=false;
  for(let i=0;i<80;i++) {await sleep(150); preview=await cdp.eval('!!document.querySelector(".cash-close-preview")');if(preview) break;}
  must(preview,"PREVIEW_NOT_RENDERED:"+await cdp.eval('JSON.stringify({panel:document.querySelector(".cash-close-panel")?.innerText?.slice(-320),inputs:[...document.querySelectorAll(".cash-close-fields input")].map(e=>e.value),ready:document.readyState,url:location.href})'));
  const parsed=await cdp.eval('document.querySelector(".cash-close-preview")?.innerText');
  must(parsed.includes("200.00 USD") && parsed.includes("0.00 USD"),"PREVIEW_MONEY_WRONG:"+parsed);
  await cdp.eval('document.querySelector(".cash-close-preview")?.scrollIntoView()');
  await shot("cash-mobile-preview");
  must(await cdp.eval('!!document.querySelector(".cash-close-preview button.primary")'),"CONFIRM_BUTTON_MISSING");
  await cdp.eval('document.querySelector(".cash-close-preview button.primary").click()');
  let persistedClose=false;
  for(let i=0;i<100;i++) {
    await sleep(200);
    const recorded=await db.cashSession.findUnique({where:{id:cashSession.id},select:{status:true}});
    if(recorded?.status==="CLOSED") { persistedClose=true; break; }
  }
  must(persistedClose,"CLOSE_NOT_PERSISTED");
  const auditCount=await db.auditEvent.count({where:{tenantId:tenant.id,branchId:branch.id,action:"cash.session.closed",entityId:cashSession.id}});
  must(auditCount===1,"CLOSE_AUDIT_MISSING_OR_DUPLICATED:"+auditCount);
  await sleep(1200);
  await shot("cash-mobile-closed");  console.log("C14_CHROME_UAT_PASS",JSON.stringify({desktopMetrics:4,mobileMetrics:4,mobileOverflow:false,preview:"PASS",close:"PASS",audit:"PASS",db:"mobi_uat",html:"PASS"}));
  await writeFile(path.join(output,"c14-browser-result.json"),JSON.stringify({result:"PASS",date:new Date().toISOString(),desktopMetrics:4,mobileMetrics:4,preview:"PASS",close:"PASS",audit:"PASS",db:"mobi_uat",html:"PASS"},null,2)+"\n");
} finally {
  try{socket?.close();}catch{}
  try{browser?.kill();}catch{}
  await sleep(300);
  try{await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:300});}catch{}
  if(tenant?.id) {
    await db.auditEvent.deleteMany({where:{tenantId:tenant.id}});
    await db.session.deleteMany({where:{user:{tenantId:tenant.id}}});
    if(cashSession) await db.cashSession.deleteMany({where:{id:cashSession.id}});
    await db.userRole.deleteMany({where:{user:{tenantId:tenant.id}}});
    await db.rolePermission.deleteMany({where:{role:{tenantId:tenant.id}}});
    await db.role.deleteMany({where:{tenantId:tenant.id}});
    await db.user.deleteMany({where:{tenantId:tenant.id}});
    await db.branch.deleteMany({where:{tenantId:tenant.id}});
    await db.tenant.deleteMany({where:{id:tenant.id}});
  }
  await db.$disconnect();
}