import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.APP_ORIGIN || "http://127.0.0.1:3185";
const chrome = process.env.CHROME_BIN;
const secret = process.env.A1_MOBI_BOOTSTRAP_SECRET;
const outputDir = "C:/A1Hub/a1-mobi/versions/C-LIVE-02";

if (!chrome) throw new Error("CHROME_BIN is required");
if (!secret || secret.length < 32) throw new Error("A1_MOBI_BOOTSTRAP_SECRET is required");

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
  "--user-data-dir=C:/A1Hub/a1-mobi/versions/C-LIVE-02/chrome-cdp-profile",
  "--no-first-run",
  "--no-default-browser-check",
  "about:blank",
], { stdio: ["ignore", "ignore", "ignore"] });

try {
  await waitFor("http://127.0.0.1:9222/json/version");
  const { cdp, ws } = await createCdpTarget("about:blank");

  await navigate(cdp, base + "/product/ar", 1440, 900);
  assert(await evaluate(cdp, 'document.querySelectorAll(".mobi-a-feature-card").length === 6'), "A must show six feature cards");
  assert(await evaluate(cdp, 'Boolean(document.querySelector(".mobi-a-device-mockup"))'), "A dashboard device mockup missing");
  assert(await evaluate(cdp, 'Boolean(document.querySelector(".mobi-headline-blue") && document.querySelector(".mobi-headline-orange"))'), "A colored headline missing");
  assert(await evaluate(cdp, 'document.querySelector(".mobi-wordmark")?.textContent.replace(/\\s+/g,"").includes("A1Mobi")'), "A1 Mobi wordmark order is wrong");

  await navigate(cdp, base + "/store-preview", 1440, 900);
  const bViewport = await evaluate(cdp, '({scrollHeight:document.documentElement.scrollHeight,innerHeight:window.innerHeight})');
  assert(bViewport.scrollHeight > bViewport.innerHeight * 1.5, "B must be a fully scrollable merchant site: " + JSON.stringify(bViewport));
  assert(await evaluate(cdp, 'document.querySelectorAll(".mobi-store-product").length >= 8'), "B should show a real storefront catalog");
  assert(await evaluate(cdp, '["services","about-store","store-contact"].every(id=>Boolean(document.getElementById(id)))'), "B merchant services/about/contact sections missing");
  assert(await evaluate(cdp, 'document.querySelectorAll(".mobi-store-faq-list details").length === 3'), "B customer FAQ missing");
  assert(await evaluate(cdp, 'document.querySelectorAll(".mobi-store-product").length >= 8'), "B must render expanded merchant catalog");
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
  const aMobile = await evaluate(cdp, '({scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth})');
  assert(aMobile.scrollWidth <= aMobile.innerWidth, "A mobile horizontal overflow: " + JSON.stringify(aMobile));
  assert(await evaluate(cdp, '!/[\u00d8\u00d9]/u.test(document.body.innerText)'), "A mobile Arabic encoding corrupted");
  await navigate(cdp, base + "/store-preview", 390, 844);
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

  const suffix = Date.now().toString();
  const tenant = "visual-" + suffix;
  const email = "owner-" + suffix + "@example.test";
  const password = "Visual-owner-password-" + suffix;

  const bootstrap = await fetch(base + "/api/bootstrap", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-a1-bootstrap-secret": secret,
    },
    body: JSON.stringify({
      tenantSlug: tenant,
      tenantName: "Visual Journey Store",
      branchCode: "MAIN",
      branchName: "Main Branch",
      ownerEmail: email,
      ownerDisplayName: "Visual Owner",
      ownerPassword: password,
      locale: "ar",
    }),
  });
  assert(bootstrap.status === 201, "C visual bootstrap failed: " + bootstrap.status);

  const login = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: base,
    },
    body: JSON.stringify({ tenant, email, password }),
  });
  assert(login.ok, "C visual login failed: " + login.status);

  const setCookie = typeof login.headers.getSetCookie === "function"
    ? login.headers.getSetCookie()[0]
    : login.headers.get("set-cookie");
  assert(setCookie, "C visual login did not return cookie");
  const first = setCookie.split(";")[0];
  const split = first.indexOf("=");
  const cookieName = first.slice(0, split);
  const cookieValue = first.slice(split + 1);
  const cookieResult = await cdp.send("Network.setCookie", {
    name: cookieName,
    value: cookieValue,
    url: base,
    path: "/",
    secure: cookieName.startsWith("__Host-"),
    httpOnly: true,
    sameSite: "Lax",
  });
  assert(cookieResult.success, "Unable to set authenticated C cookie");

  await navigate(cdp, base + "/ar", 1440, 1000);
  assert(await evaluate(cdp, 'location.pathname === "/ar"'), "C authenticated dashboard redirected unexpectedly");
  assert(await evaluate(cdp, 'Boolean(document.querySelector(".mobi-c-spotlight"))'), "C quick action panel missing");
  assert(await evaluate(cdp, 'document.querySelectorAll(".metrics .metric").length >= 4'), "C KPI cards missing");
  assert(await evaluate(cdp, 'Boolean(document.querySelector(".mobi-c-insight"))'), "C chart missing");
  assert(await evaluate(cdp, 'document.querySelectorAll(".mobi-c-ops-grid .activity-card").length === 2'), "C repair/low-stock panels missing");
  assert(await evaluate(cdp, 'Boolean(document.querySelector(".sidebar-toggle"))'), "C sidebar toggle missing");

  await evaluate(cdp, 'document.querySelector(".sidebar-toggle").click(); true');
  await sleep(150);
  assert(await evaluate(cdp, 'document.querySelector(".app-shell").classList.contains("sidebar-collapsed")'), "C sidebar did not collapse");
  await evaluate(cdp, 'document.querySelector(".sidebar-toggle").click(); true');
  await sleep(150);
  await capture(cdp, "c-dashboard-authenticated-desktop");

  await navigate(cdp,base+"/ar/live-02",1440,900);
  for(let i=0;i<75;i++){
    if(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-forms form").length===2'))break;
    await sleep(200);
  }
  assert(await evaluate(cdp,'location.pathname==="/ar/live-02"'),"C-LIVE-02 redirect");
  assert(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-forms form").length===2'),"C-LIVE-02 intake/estimate forms absent");
  await capture(cdp,"c-live-02-desktop");
  const desk=await evaluate(cdp,'({width:window.innerWidth,scroll:document.documentElement.scrollWidth})');
  assert(desk.scroll<=desk.width+2,"C-LIVE-02 desktop overflow "+JSON.stringify(desk));
  await navigate(cdp,base+"/ar/live-02",390,844);
  for(let i=0;i<75;i++){
    if(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-forms form").length===2'))break;
    await sleep(200);
  }
  const mobi=await evaluate(cdp,'({width:window.innerWidth,scroll:document.documentElement.scrollWidth,forms:document.querySelectorAll(".mobi-live02-forms form").length})');
  assert(mobi.forms===2 && mobi.scroll<=mobi.width+2,"C-LIVE-02 mobile overflow "+JSON.stringify(mobi));
  await capture(cdp,"c-live-02-mobile");
  await navigate(cdp,base+"/en/live-02",1440,900);
  for(let i=0;i<75;i++){
    if(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-forms form").length===2'))break;
    await sleep(200);
  }
  assert(await evaluate(cdp,'document.querySelector("h1")?.textContent==="Repair orders"'),"English repair heading not localized");
  await capture(cdp,"c-live-02-english");
  console.log("C_LIVE_02_VISUAL_GATE_PASS",JSON.stringify({desktop:desk,mobile:mobi,english:true}));


  console.log("C_LIVE_02_BROWSER_VISUAL_PASS");

  await navigate(cdp,base+"/ar/live-02",1440,900);
  async function waitUi(js) {
    for(let i=0;i<100;i++){if(await evaluate(cdp,js))return;await sleep(200);}
    throw new Error("C-LIVE-02 action gate timeout: "+js);
  }
  await waitUi('document.querySelectorAll(".mobi-live02-forms form").length===2');
  const fill=(root, values)=>'(() => {const nodes=[...document.querySelector('+JSON.stringify(root)+').querySelectorAll("input")];'+
    'const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;'+
    'const vals='+JSON.stringify(values)+';vals.forEach((v,i)=>{setter.call(nodes[i],v);nodes[i].dispatchEvent(new Event("input",{bubbles:true}));});return nodes.length;})()';
  const values=["Visual Repair UAT Customer","+96170123456","Sample Samsung Phone","356938035643809","Light scratches","LCD broken"];
  assert(await evaluate(cdp,fill(".mobi-live02-forms form",values))===6,"Intake form fields changed");
  await sleep(220);
  await evaluate(cdp,'document.querySelectorAll(".mobi-live02-forms form")[0].requestSubmit();true');
  await waitUi('document.querySelector(".activity-card tbody")?.innerText.includes("Visual Repair UAT Customer")');
  await capture(cdp,"c-live-02-browser-intake");
  console.log("C_LIVE_02_BROWSER_INTAKE_PASS");
  await evaluate(cdp,'(() => {const el=document.querySelectorAll(".mobi-live02-forms form")[1].querySelector("select");const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set;setter.call(el,el.options[1].value);el.dispatchEvent(new Event("change",{bubbles:true}));return true;})()');
  await sleep(200);
  assert(await evaluate(cdp,fill(".mobi-live02-forms form:nth-child(2)",["Damaged display confirmed","120"]))===2,"Estimate form fields changed");
  await sleep(250);
  await evaluate(cdp,'document.querySelectorAll(".mobi-live02-forms form")[1].requestSubmit();true');
  await waitUi('document.querySelector(".activity-card tbody")?.innerText.includes("بانتظار الموافقة")');
  await evaluate(cdp,'[...document.querySelectorAll(".activity-card tbody button")].find(b=>b.textContent.includes("اعتماد"))?.click();true');
  await waitUi('document.querySelector(".activity-card tbody")?.innerText.includes("معتمد")');
  await evaluate(cdp,'[...document.querySelectorAll(".activity-card tbody button")].find(b=>b.textContent.includes("بدء الإصلاح"))?.click();true');
  await waitUi('document.querySelector(".activity-card tbody")?.innerText.includes("قيد الإصلاح")');
  await capture(cdp,"c-live-02-browser-active-repair");
  await evaluate(cdp,'document.querySelector(".mobi-live02-ready summary")?.click();true');
  await sleep(300);
  assert(await evaluate(cdp,fill(".mobi-live02-ready form",["120","20","5"]))===3,"Final repair form fields changed");
  await evaluate(cdp,'window.confirm=()=>true;true');
  await sleep(300);
  await evaluate(cdp,'document.querySelector(".mobi-live02-ready form")?.requestSubmit();true');
  await waitUi('document.querySelector(".activity-card tbody")?.innerText.includes("جاهز للتسليم")');
  await navigate(cdp,base+"/ar/live-02",1440,900);
  await waitUi('document.querySelector(".activity-card tbody")?.innerText.includes("جاهز للتسليم")');
  await capture(cdp,"c-live-02-browser-ready-reloaded");
  console.log("C_LIVE_02_BROWSER_REAL_ACTIONS_PASS",JSON.stringify({created:true,estimated:true,approved:true,started:true,ready:true,persistedAfterReload:true}));

  await waitUi('document.querySelector(".mobi-live02-cash form")!==null');
  await evaluate(cdp,'(() => { const nodes=document.querySelectorAll(".mobi-live02-cash form input"); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;set.call(nodes[2],"90000");nodes[2].dispatchEvent(new Event("input",{bubbles:true}));window.confirm=()=>true;return true;})()');
  await sleep(150);
  await evaluate(cdp,'document.querySelector(".mobi-live02-cash form").requestSubmit();true');
  await waitUi('document.querySelector(".mobi-live02-cash h2")?.innerText.includes("الصندوق مفتوح")');
  console.log("C_LIVE_02_BROWSER_CASH_OPEN_PASS");
  async function enterPayment(value){
    const expr='(() => { const node=document.querySelector(".mobi-live02-settlement form input[type=number]");const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;set.call(node,'+
      JSON.stringify(value)+');node.dispatchEvent(new Event("input",{bubbles:true}));window.confirm=()=>true;return true;})()';
    await evaluate(cdp,expr);
    await sleep(150);
    await evaluate(cdp,'document.querySelector(".mobi-live02-settlement form").requestSubmit();true');
  }
  await enterPayment("50");
  await waitUi('document.querySelector(".mobi-live02-settlement")?.innerText.includes("70.00")');
  await capture(cdp,"c-live-02-browser-partial-payment");
  await enterPayment("70");
  await waitUi('document.querySelector(".mobi-live02-settlement")?.innerText.includes("تم تسديد القيمة")');
  console.log("C_LIVE_02_BROWSER_FULL_PAYMENT_PASS");
  await evaluate(cdp,'(() => {const form=document.querySelector(".mobi-live02-settlement form");const input=form.querySelectorAll("input")[1];const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;set.call(input,"Parts and workmanship for 30 days");input.dispatchEvent(new Event("input",{bubbles:true}));form.querySelector("input[type=checkbox]").click();window.confirm=()=>true;return true;})()');
  await sleep(190);
  await evaluate(cdp,'document.querySelector(".mobi-live02-settlement form").requestSubmit();true');
  await waitUi('document.querySelector(".activity-card tbody")?.innerText.includes("تم التسليم")');
  await navigate(cdp,base+"/ar/live-02",1440,900);
  await waitUi('document.querySelector(".activity-card tbody")?.innerText.includes("تم التسليم") && document.querySelector(".mobi-live02-settlement")?.innerText.includes("الضمان")');
  await capture(cdp,"c-live-02-browser-delivered-warranty");
  console.log("C_LIVE_02_SETTLEMENT_E2E_PASS",JSON.stringify({cashOpen:true,partialPayment:50,finalPayment:70,delivered:true,warranty:true,persistedAfterReload:true}));

  ws.close();
} finally {
  chromeProcess.kill("SIGTERM");
}
