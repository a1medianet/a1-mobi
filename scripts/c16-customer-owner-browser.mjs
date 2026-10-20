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
  const response = await fetch("http://127.0.0.1:9240/json/new?" + encodeURIComponent(url), { method: "PUT" });
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


const origin=process.env.APP_ORIGIN||"http://127.0.0.1:3224";
const bootstrapSecret=process.env.A1_MOBI_BOOTSTRAP_SECRET;
assert(bootstrapSecret?.length>=32,"Need UAT bootstrap secret");
const suffix=Date.now().toString(36);
const tenant="webpilot-"+suffix,email="pilot-"+suffix+"@example.test";
const password="Pilot-UAT-c16-"+suffix+"-Secure";
const post=async(path,data,cookie)=>fetch(origin+path,{method:"POST",
 headers:{"content-type":"application/json",origin,...(cookie?{cookie}:{})},body:JSON.stringify(data)});
const bootstrap=await fetch(origin+"/api/bootstrap",{method:"POST",
 headers:{"content-type":"application/json","x-a1-bootstrap-secret":bootstrapSecret},
 body:JSON.stringify({tenantSlug:tenant,tenantName:"Phone Shop Pilot",
 branchCode:"MAIN",branchName:"Phone Shop Main",ownerEmail:email,
 ownerDisplayName:"Test Owner",ownerPassword:password,locale:"ar"})});
assert(bootstrap.status===201,"UAT create store failed "+bootstrap.status);
const login=await post("/api/auth/login",{tenant,email,password});
assert(login.ok,"UAT owner sign-in failed "+login.status);
const cookie=(login.headers.get("set-cookie")||"").split(";")[0];
assert(cookie.includes("="),"Owner cookie missing");
const product=await post("/api/ops/live-01",{action:"createProduct",
 sku:"PILOT-"+suffix.toUpperCase(),brand:"SAMPLE",model:"Phone",
 variant:"128GB",nameAr:"هاتف اختبار للطلب",nameEn:"Pilot Phone",unitCost:190,price:425.5},cookie);
assert(product.status===201,"UAT catalog insert failed "+product.status);
const p=await product.json();
const baseImei="35"+String(Math.floor(Math.random()*1e12)).padStart(12,"0");
let sum=0;
for(let i=0;i<14;i++){let digit=Number(baseImei[i]);if(i%2===1){digit*=2;if(digit>9)digit-=9;}sum+=digit;}
const imei=baseImei+String((10-sum%10)%10);
const received=await post("/api/ops/live-01",{action:"receive",productId:p.id,
 variantId:p.variantId,locationId:p.locationId,imei,unitCost:190,idempotencyKey:crypto.randomUUID()},cookie);
assert(received.status===201,"UAT phone intake failed "+received.status);
const enabled=await post("/api/ops/store-orders",{action:"activate"},cookie);
assert(enabled.ok,"Owner activation failed "+enabled.status);
const {slug}=await enabled.json();
assert(/^[a-f0-9]{32}$/.test(slug),"Unexpected storefront link");
const chromeProcess=spawn(chrome,["--headless","--no-sandbox","--disable-gpu","--no-first-run",
 "--remote-debugging-port=9240","--user-data-dir=C:/A1Hub/a1-mobi/.local/chrome-c16-journey",
 "about:blank"],{stdio:["ignore","ignore","ignore"]});
try{
 await waitFor("http://127.0.0.1:9240/json/version",100);
 const {cdp,ws}=await createCdpTarget("about:blank");
 await navigate(cdp,origin+"/shop/"+slug,1440,900);
 assert(await evaluate(cdp,'document.querySelectorAll(".mobi-order-products article").length===1'),"Actual available device not visible");
 assert(await evaluate(cdp,'document.querySelector("form.mobi-order-checkout")?.innerText.includes("إرسال")'),"Customer checkout missing");
 await evaluate(cdp,'[...document.querySelectorAll("nextjs-portal")].forEach(n=>n.style.display="none");true');
 await capture(cdp,"customer-desktop");
 await navigate(cdp,origin+"/shop/"+slug,390,844);
 const mobile=await evaluate(cdp,'({width:document.documentElement.scrollWidth,innerWidth:window.innerWidth})');
 assert(mobile.width<=mobile.innerWidth,"Customer mobile overflows: "+JSON.stringify(mobile));
 await evaluate(cdp,'[...document.querySelectorAll("nextjs-portal")].forEach(n=>n.style.display="none");true');
 await capture(cdp,"customer-mobile");
 await evaluate(cdp,'document.querySelector(".mobi-order-qty button:last-child").click();true');
 await sleep(200);
 await evaluate(cdp,'(()=>{const entries=[["input[autocomplete=name]","Pilot Customer"],["input[autocomplete=tel]","+96170123456"]];for(const [s,v] of entries){const e=document.querySelector(s);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(e,v);e.dispatchEvent(new Event("input",{bubbles:true}));}return true})()');
 await sleep(200);
 await evaluate(cdp,'document.querySelector("form.mobi-order-checkout").requestSubmit();true');
 let confirmed=false;
 for(let retry=0;retry<210;retry++){if(await evaluate(cdp,'Boolean(document.querySelector(".mobi-order-success"))')){confirmed=true;break;}await sleep(300);}
 if(!confirmed){
  const debug=await evaluate(cdp,'({body:document.body.innerText.slice(-900),valid:document.querySelector("form.mobi-order-checkout")?.checkValidity(),units:document.querySelector(".mobi-order-total")?.textContent,inputs:[...document.querySelectorAll("form.mobi-order-checkout input")].map(x=>({name:x.name,value:x.value,valid:x.checkValidity()}))})');
  await capture(cdp,"customer-failed-checkout");
  console.log("C16_CUSTOMER_FORM_DEBUG",JSON.stringify(debug));
}
assert(confirmed,"Customer did not receive confirmation reference");
 const reference=await evaluate(cdp,'document.querySelector(".mobi-order-success strong")?.textContent');
 assert(reference?.startsWith("WEB-"),"Customer order reference missing");
 await capture(cdp,"customer-confirmation");
 const current=await fetch(origin+"/api/ops/store-orders",{headers:{cookie}});
 assert(current.ok,"Owner order inbox HTTP failed");
 const data=await current.json();
 const request=data.orders.find(o=>o.number===reference);
 assert(request&&request.totalAmount===425.5&&request.status==="NEW","Order not received by owner");
 const cookieName=cookie.slice(0,cookie.indexOf("="));
 const cookieValue=cookie.slice(cookie.indexOf("=")+1);
 await cdp.send("Network.setCookie",{name:cookieName,value:cookieValue,url:origin,path:"/"});
 await navigate(cdp,origin+"/ar/orders",1440,900);
 let ownerReady=false;
 for(let retry=0;retry<30;retry++){if(await evaluate(cdp,'document.querySelector(".mobi-order-cards")?.innerText.includes("WEB-")')){ownerReady=true;break;}await sleep(300);}
 assert(ownerReady,"Owner dashboard inbox does not display the submitted order");
 await evaluate(cdp,'[...document.querySelectorAll("nextjs-portal")].forEach(n=>n.style.display="none");true');
 await capture(cdp,"owner-orders-desktop");
 await evaluate(cdp,'document.querySelector(".mobi-order-cards article button").click();true');
 await sleep(850);
 const updated=await fetch(origin+"/api/ops/store-orders",{headers:{cookie}});
 const result=await updated.json();
 assert(result.orders.some(o=>o.number===reference&&o.status==="CONFIRMED"),"Owner could not confirm order");
 await navigate(cdp,origin+"/ar/orders",390,844);
 const ownerMobile=await evaluate(cdp,'({width:document.documentElement.scrollWidth,innerWidth:window.innerWidth})');
 assert(ownerMobile.width<=ownerMobile.innerWidth,"Owner mobile overflow");
 await evaluate(cdp,'[...document.querySelectorAll("nextjs-portal")].forEach(n=>n.style.display="none");true');
 await capture(cdp,"owner-orders-mobile");
 const report={status:"PASS",reference,customerTotal:request.totalAmount,ownerStatus:"CONFIRMED",
  mobile,ownerMobile,store:"synthetic UAT only",scenarios:["inventory intake","owner enables link",
  "customer sees catalog","mobile shop","browser checkout","order reference",
  "owner inbox receipt","owner confirmation","mobile owner view"]};
 await writeFile(outputDir+"/c16-browser-result.json",JSON.stringify(report,null,2)+"\n");
 console.log("C16_BROWSER_CUSTOMER_TO_OWNER_PASS",JSON.stringify(report));
 ws.close();
}finally{chromeProcess.kill("SIGTERM");}
