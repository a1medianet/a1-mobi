import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

// Local-only, synthetic UAT gate. Never serialize credentials, cookies or request bodies.
process.loadEnvFile('.env.local');
const base = process.env.OWNER_QA_ORIGIN || 'http://127.0.0.1:3225';
const out = process.env.OWNER_QA_OUTPUT || ('docs/reviews/2026-10-21/autonomous-qa'+(process.env.OWNER_QA_FOCUSED?'/focused':''));
const port = Number(process.env.OWNER_QA_CDP_PORT || 9367);
const run = Date.now().toString();
const profile = `${process.cwd()}/.local/owner-journey-${run}`;
const tenant = `owner-gate-${run}`;
const email = `owner-${run}@example.test`;
const password = randomBytes(24).toString('hex');
const results = [], errors = [];
const filter = process.env.OWNER_QA_FILTER ? new RegExp(process.env.OWNER_QA_FILTER) : null;
const redact = value => typeof value === 'string'
  ? [password, email, tenant, process.env.A1_MOBI_BOOTSTRAP_SECRET, process.env.DATABASE_URL].filter(Boolean).reduce((s, secret) => s.replaceAll(secret, '[REDACTED]'), value)
  : Array.isArray(value) ? value.map(redact)
  : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k,v]) => [k, redact(v)])) : value;
let browser, ws, cdp, fixtureId;
const db = new PrismaClient();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const check = (ok, message) => { if (!ok) throw new Error(message); };
class CDP {
  constructor(socket) { this.socket=socket; this.id=0; this.pending=new Map(); socket.onmessage=e=>{const m=JSON.parse(e.data); if(m.id){const p=this.pending.get(m.id);if(p){clearTimeout(p.timer);this.pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}} else if(m.method==='Runtime.exceptionThrown') errors.push({route:this.route,kind:'uncaught',text:m.params.exceptionDetails.text}); else if(m.method==='Runtime.consoleAPICalled' && m.params.type==='error') errors.push({route:this.route,kind:'console-error'});}; }
  send(method,params={}) {const id=++this.id; return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout: ${method}`));},20000);this.pending.set(id,{resolve,reject,timer});this.socket.send(JSON.stringify({id,method,params}));});}
}
async function ev(expression) {const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});check(!r.exceptionDetails,'Browser evaluation failed');return r.result?.value;}
async function until(expression,timeout=15000){const start=Date.now();while(Date.now()-start<timeout){if(await ev(expression))return;await sleep(100);}throw new Error('Browser condition timed out');}
async function nav(path,width=1440){
  cdp.route=path;
  await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:900,deviceScaleFactor:1,mobile:width===390});
  // readyState can still belong to the previous document when Page.navigate returns.
  await ev('window.__ownerGateOldDocument=true');
  const navigation=await cdp.send('Page.navigate',{url:base+path});
  check(!navigation.errorText,'Navigation failed: '+navigation.errorText);
  await until(`!window.__ownerGateOldDocument && location.pathname===${JSON.stringify(path)} && document.readyState === "complete"`);
  await ev('document.fonts.ready.then(()=>true)');
}
async function shot(name){
  // Keep fixture identities and entered credentials out of screenshot evidence too.
  await ev(`(()=>{const secrets=${JSON.stringify([email,tenant,password])};const nodes=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const n=walker.currentNode;if(secrets.some(s=>n.textContent.includes(s))){nodes.push([n,n.textContent]);for(const s of secrets)n.textContent=n.textContent.replaceAll(s,'[REDACTED]');}}const style=document.createElement('style');style.textContent='input { color: transparent !important; text-shadow: none !important; caret-color: transparent !important; }';document.head.append(style);window.__ownerScreenshotRestore=()=>{style.remove();for(const [n,text] of nodes)n.textContent=text;delete window.__ownerScreenshotRestore;};return true;})()`);
  try {
    let r;try{r=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});}catch{await sleep(300);r=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});}
    await writeFile(`${out}/${name}.png`,Buffer.from(r.data,'base64'));
  } finally { await ev('window.__ownerScreenshotRestore?.();true'); }
}
async function test(name,fn){const prerequisite=filter && ((name==='ar-logout-revokes-session' && (filter.test('actual-en-form-login-fresh-session') || filter.test('en-logout-revokes-session'))) || (name==='actual-en-form-login-fresh-session' && filter.test('en-logout-revokes-session')));if(filter && !filter.test(name) && !prerequisite && !['bootstrap-isolated-uat','actual-ar-form-login','isolated-fixture-cleanup','no-uncaught-js-or-console-errors'].includes(name))return;if(!filter&&process.env.OWNER_QA_FOCUSED&&!name.startsWith('B-en-reading-direction'))return;const start=Date.now();try{const detail=await fn();results.push({name,status:'PASS',ms:Date.now()-start,...(detail?{detail}:{})});console.log('PASS '+name);}catch(e){results.push({name,status:'FAIL',ms:Date.now()-start,error:e.message});console.log('FAIL '+name+': '+redact(e.message));}}
async function layout(){
  // Client transitions and streamed responses may briefly have no app heading.
  await until(` /Application error|Internal Server Error|This page could not be found/.test(document.body.innerText) || (!!document.querySelector('h1,h2') && document.body.innerText.length>40)`);
  const imageLoads=await ev(`Promise.all([...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.width>0 && r.height>0 && r.right>0 && r.left<innerWidth && r.bottom>0 && r.top<innerHeight}).map(async i=>{
    // Trigger native lazy loading only for images that are actually visible.
    i.loading='eager';
    let timer;
    try { await Promise.race([i.decode(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('decode timeout')),8000)})]); return null; }
    catch { return new URL(i.currentSrc||i.src).pathname; }
    finally { clearTimeout(timer); }
  }))`);
  check(!imageLoads.some(Boolean),'Broken visible imagery: '+imageLoads.filter(Boolean).join(','));
const x=await ev(`({width:innerWidth,scroll:document.documentElement.scrollWidth,heading:!!document.querySelector('h1,h2'),text:document.body.innerText.length,badImages:[...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.width>0 && r.bottom>0 && r.top<innerHeight && (!i.complete||i.naturalWidth===0)}).map(i=>new URL(i.src).pathname),fatal:/Application error|Internal Server Error|This page could not be found/.test(document.body.innerText)})`);check(x.scroll<=x.width+2,`Horizontal overflow ${x.scroll}/${x.width}`);check(x.heading&&x.text>40&&!x.fatal,'Missing content or error page');check(!x.badImages.length,'Broken visible imagery: '+x.badImages.join(','));return x;}
async function fill(values){await ev(`(()=>{const values=${JSON.stringify(values)};for(const [name,value] of Object.entries(values)){const input=document.querySelector('input[name="'+name+'"]');if(!input)throw Error('Missing input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('form button.primary').click();return true;})()`);}
async function login(locale){await nav(`/${locale}/login`);await until('!!document.querySelector("input[name=tenant]")');await fill({tenant,email,password});await until(`location.pathname==='/${locale}/admin'||location.pathname==='/${locale}'`,20000);const cookies=await cdp.send('Network.getCookies',{urls:[base]});check(cookies.cookies.some(c=>c.httpOnly&&c.value.length>10),'Server authentication cookie missing');const session=await ev(`fetch('/api/auth/session').then(async r=>({status:r.status,body:await r.json()}))`);check(session.status===200,'Session not authenticated');check(session.body.permissions?.length>10,'Owner permission set absent from session');return {serverSession:200,httpOnlyCookie:true,redirect:await ev('location.pathname')};}
async function logout(locale){await nav(`/${locale}/login`);await until('!!document.querySelector(".auth-card [role=status]")');await ev('document.querySelector(".auth-card button.primary").click()');await until('!!document.querySelector("input[name=tenant]")');check(await ev(`fetch('/api/auth/session').then(r=>r.status)`)===401,'Logout did not revoke session');}
try {
  check(new URL(process.env.DATABASE_URL).pathname.replace(/\/$/,'')==='/mobi_uat','Database must be mobi_uat');
  const origin=new URL(base);
  check(origin.protocol==='http:' && ['127.0.0.1','localhost','[::1]'].includes(origin.hostname) && !origin.username && !origin.password,'Preview must be a credential-free local HTTP origin');
  check(process.env.A1_MOBI_BOOTSTRAP_SECRET?.length>=32,'Bootstrap secret unavailable');
  check((await fetch(base+'/ar/login')).ok,'Stable preview unavailable');
  // Fail closed if the dedicated debugging port is already occupied.
  let occupied=false;try{await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(1000)});occupied=true;}catch{}check(!occupied,'Dedicated CDP port occupied');
  await mkdir(out,{recursive:true});
  browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--no-sandbox','--disable-gpu',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','about:blank'],{stdio:'ignore',windowsHide:true});
  for(let n=0;n<60;n++){try{if((await fetch(`http://127.0.0.1:${port}/json/version`)).ok)break;}catch{}await sleep(150);}
  const target=await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=()=>j(Error('Chrome websocket failed'));});cdp=new CDP(ws);
  for(const method of ['Page.enable','Runtime.enable','Network.enable'])await cdp.send(method);
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  for(const locale of ['ar','en'])for(const width of [1440,390])await test(`login-${locale}-${width}-hydration`,async()=>{await nav(`/${locale}/login`,width);await until('!!document.querySelector("form button.primary:not(:disabled)")');check(await ev(`[...document.querySelectorAll('input')].filter(i=>['tenant','email','password'].includes(i.name)).length===3`),'Login fields absent');check(await ev(`[...document.images].some(i=>i.src.includes('/brand/a1-mobi-logo')&&i.complete&&i.naturalWidth>0)`),'Official logo missing');await shot(`login-${locale}-${width}`);return layout();});
  for(const locale of ['ar','en'])await test(`invalid-form-${locale}`,async()=>{await nav(`/${locale}/login`);await fill({tenant,email,password:'invalid-synthetic-password'});await until('!!document.querySelector("[role=alert]")');const text=await ev('document.querySelector("[role=alert]").textContent');check(locale==='ar'?text.includes('تعذر الدخول'):text.includes('Unable to sign in'),'Expected localized invalid-credential error; received: '+text);check(await ev('!!document.querySelector("form button.primary:not(:disabled)")&&[...document.querySelectorAll("form input")].every(i=>!i.disabled)'),'Form not editable');await shot(`invalid-${locale}`);});
  await test('pending-timeout-browser-recovery',async()=>{await nav('/en/login');await ev(`(()=>{window.__originalFetch=window.fetch;window.fetch=(url,options)=>String(url).includes('/api/auth/login')?new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')))):window.__originalFetch(url,options);return true;})()`);await fill({tenant,email,password:'timeout-synthetic-password'});await until('!!document.querySelector("form button.primary:disabled")');await until('document.querySelector("[role=alert]")?.textContent.includes("connection took too long")',16000);check(await ev('!!document.querySelector("form button.primary:not(:disabled)")'),'Timeout left form busy');await shot('timeout-recovery');await ev('window.fetch=window.__originalFetch;delete window.__originalFetch;true');});
  await test('bootstrap-isolated-uat',async()=>{const r=await fetch(base+'/api/bootstrap',{method:'POST',headers:{'content-type':'application/json','x-a1-bootstrap-secret':process.env.A1_MOBI_BOOTSTRAP_SECRET},body:JSON.stringify({tenantSlug:tenant,tenantName:'Autonomous QA Synthetic Store',branchCode:'MAIN',branchName:'QA Branch',ownerEmail:email,ownerDisplayName:'Synthetic QA Owner',ownerPassword:password,locale:'ar'})});check(r.status===201,`Bootstrap HTTP ${r.status}`);fixtureId=(await r.json()).bootstrap.tenantId;const found=await db.tenant.findUnique({where:{id:fixtureId},select:{slug:true}});check(found?.slug===tenant,'Preview fixture not found in checked UAT database');return {database:'mobi_uat',synthetic:true};});
  if(fixtureId){
    await test('actual-ar-form-login',()=>login('ar'));
    const routes=['admin','settings/team','account','pos','products','inventory','repairs','customers','cash','reports'];
    for(const locale of ['ar','en'])for(const width of [1440,390])for(const route of routes)await test(`C-${locale}-${width}-${route.replaceAll('/','-')}`,async()=>{const path=`/${locale}/${route}`;await nav(path,width);check(await ev('location.pathname')===path,'Protected page redirected');const detail=await layout();check(await ev('!!document.querySelector("header")'),'Header absent');await shot(`c-${locale}-${width}-${route.replaceAll('/','-')}`);return detail;});
    await test('C-key-navigation-actual-clicks',async()=>{for(const route of ['pos','products','inventory','repairs','customers','cash','reports']){await nav('/ar');const href='/ar/'+route;check(await ev(`(()=>{const a=[...document.querySelectorAll('a')].find(a=>a.getAttribute('href')===${JSON.stringify(href)});if(!a)return false;a.click();return true;})()`),'Missing navigation link '+route);await until(`location.pathname===${JSON.stringify(href)}`);await layout();}});
  if(filter?.test('gate-visible-image-negative-control'))await test('gate-visible-image-negative-control',async()=>{
    await nav('/ar/products');await layout();
    await ev(`(()=>{const i=document.createElement('img');i.id='owner-gate-broken-control';i.src='data:image/png;base64,AA==';i.style='position:fixed;top:0;left:0;width:80px;height:80px;z-index:99999';document.body.append(i);return true;})()`);
    let rejected=false;
    try { await layout(); } catch(e) { check(e.message.startsWith('Broken visible imagery:'),'Unexpected negative-control failure: '+e.message);rejected=true; }
    finally { await ev('document.getElementById("owner-gate-broken-control").remove();true'); }
    check(rejected,'Gate accepted an undecodable visible image');
    return {undecodableVisibleImage:'rejected; temporary DOM control removed'};
  });
    await test('ar-logout-revokes-session',()=>logout('ar'));
    await test('actual-en-form-login-fresh-session',()=>login('en'));
    await test('en-logout-revokes-session',()=>logout('en'));
  }
  if(!fixtureId)for(const name of ['actual-form-login-ar-en','logout-server-revocation','C-desktop-mobile-ar-en-route-matrix','C-key-navigation'])results.push({name,status:'BLOCKED',reason:'Bootstrap HTTP 503; no synthetic authenticated fixture available'});
  for(const locale of ['ar','en'])for(const width of [1440,390])for(const page of ['', '/pricing','/demo'])await test(`A-${locale}-${width}-${page.slice(1)||'home'}`,async()=>{await nav(`/product/${locale}${page}`,width);await ev('window.scrollTo(0,document.body.scrollHeight);true');await sleep(250);await ev('window.scrollTo(0,0);true');await sleep(100);const d=await layout();await shot(`a-${locale}-${width}-${page.slice(1)||'home'}`);return d;});
  for(const locale of ['ar','en'])await test(`A-${locale}-actual-links-and-pricing-subjects`,async()=>{await nav(`/product/${locale}/pricing`);const mails=await ev(`[...document.querySelectorAll('.pricing-card a[href^="mailto:"]')].map(a=>({href:a.href,text:a.closest('article').querySelector('h2,h3')?.textContent}))`);check(mails.length===2,'Expected two plan email links');check(new Set(mails.map(m=>new URL(m.href).searchParams.get('subject'))).size===2,'Plan subjects not distinct');for(const m of mails){check(new URL(m.href).searchParams.get('subject')?.includes(m.text),'Plan subject does not match title');await ev(`(()=>{const a=[...document.querySelectorAll('a')].find(a=>a.href===${JSON.stringify(m.href)});a.addEventListener('click',e=>{window.__mailClicked=a.href;e.preventDefault();},{once:true});a.click();return true;})()`);check(await ev('window.__mailClicked')===m.href,'Email click handler not reached');}for(const path of [`/product/${locale}/demo`,`/product/${locale}/signup`,`/product/${locale}/privacy`,`/product/${locale}/terms`,`/${locale}/login`]){await nav(`/product/${locale}`);check(await ev(`(()=>{const a=[...document.querySelectorAll('a')].find(a=>a.getAttribute('href')===${JSON.stringify(path)});if(!a)return false;a.click();return true;})()`),'Public link absent '+path);await until(`location.pathname===${JSON.stringify(path)}`);await layout();}return {mailtoSubjects:mails.map(m=>new URL(m.href).searchParams.get('subject')),mailClick:'default intercepted; no email sent'};});
  for(const locale of ['ar','en'])for(const width of [1440,390])await test(`B-layout-${locale}-${width}`,async()=>{await nav('/store-preview',width);if(locale==='en'){await ev('document.querySelector(".mobi-store-lang").click()');await sleep(200);}check(await ev('document.querySelector(".mobi-store")?.getAttribute("lang")')===locale,'B locale mismatch');await ev('window.scrollTo(0,document.body.scrollHeight);true');await sleep(250);const detail=await layout();await shot(`b-${locale}-${width}-footer`);await ev('window.scrollTo(0,0);true');await shot(`b-${locale}-${width}-hero`);return detail;});
  await test('B-en-reading-direction',async()=>{await nav('/store-preview',390);await ev('document.querySelector(".mobi-store-lang").click()');await sleep(200);check(await ev('getComputedStyle(document.querySelector(".mobi-store-hero")).direction')==='ltr','English hero uses RTL CSS: punctuation and reading order incorrect');});
  await test('B-en-reading-direction-source-correction',async()=>{await nav('/store-preview',390);await ev('document.querySelector(".mobi-store-lang").click()');await sleep(200);const css=await readFile('src/app/globals.css','utf8');const marker='/* Respect the customer storefront language';check(css.includes(marker),'Source direction correction absent');await ev(`(()=>{const style=document.createElement('style');style.textContent=${JSON.stringify(css.slice(css.indexOf(marker)))};document.head.append(style);return true;})()`);check(await ev('getComputedStyle(document.querySelector(".mobi-store-hero")).direction')==='ltr','Corrected English hero still RTL');await shot('b-en-390-source-css-injected');return {validation:'Source CSS injected into fixed preview for focused verification; no rebuilt application or server modification'};});
  await test('no-uncaught-js-or-console-errors',async()=>{check(errors.length===0,`Browser errors: ${JSON.stringify(errors)}`);});
} catch(e){results.push({name:'harness',status:'FAIL',error:e.message});console.log('FAIL harness: '+redact(e.message));}
finally {
  if(fixtureId)await test('isolated-fixture-cleanup',async()=>{await db.$transaction(async tx=>{const t=await tx.tenant.findUnique({where:{id:fixtureId}});check(t?.slug===tenant&&tenant.startsWith('owner-gate-'),'Cleanup identity mismatch');const users=await tx.user.findMany({where:{tenantId:fixtureId},select:{id:true}});const roles=await tx.role.findMany({where:{tenantId:fixtureId},select:{id:true}});const ids=users.map(u=>u.id);await tx.auditEvent.deleteMany({where:{tenantId:fixtureId}});await tx.session.deleteMany({where:{userId:{in:ids}}});await tx.userRole.deleteMany({where:{userId:{in:ids}}});await tx.rolePermission.deleteMany({where:{roleId:{in:roles.map(r=>r.id)}}});await tx.user.deleteMany({where:{tenantId:fixtureId}});await tx.role.deleteMany({where:{tenantId:fixtureId}});await tx.branch.deleteMany({where:{tenantId:fixtureId}});await tx.tenant.delete({where:{id:fixtureId}});});check(await db.tenant.count({where:{id:fixtureId}})===0,'Fixture still exists');});
  await db.$disconnect();
  if(cdp){try{await cdp.send('Network.clearBrowserCookies');await cdp.send('Browser.close');}catch{}}
  ws?.close();if(browser){spawnSync('taskkill',['/PID',String(browser.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});browser.kill();await sleep(700);}await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:300}).catch(()=>{results.push({name:'profile-cleanup',status:'FAIL',error:'Ephemeral profile removal failed; review local process locks'});});
  await mkdir(out,{recursive:true});const summary={origin:base,build:'Preview served at configured origin; no hardcoded build identity',database:'mobi_uat',viewportSizes:['1440x900','390x844'],results,errors,blocked:results.filter(r=>r.status==='BLOCKED').length,passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length};
  await writeFile(`${out}/results.json`,JSON.stringify(redact(summary),null,2)+'\n');
  await writeFile(`${out}/EVIDENCE.md`,`# Autonomous local owner journey gate\n\nTHAGHR only; local fixed production preview ${base}; build identity is not assumed by the gate. No deployment, merge, sale, payment or real customer data. Database URL checked for exact mobi_uat database before bootstrap; when bootstrap succeeds its fixture is verified in the checked database. Credentials and cookies only in RAM; dedicated Chrome lifecycle handled in finally; profile cleanup failures are recorded separately.\n\nGate: ${summary.failed?'FAIL':'PASS'} — ${summary.passed} passed, ${summary.failed} failed, ${summary.blocked} blocked.\n\n## A1 First / NAWA decision and source ledger\n\nDiscover/Compare and Inspect: existing abc-browser-qa.mjs, b-customer-journey-browser.mjs, login-form.tsx, bootstrap-service.ts, pricing source and stable preview. Existing B interaction coverage retained; stale A/B visual assertions rejected because owner simplification is authoritative. Value: verify actual form authentication, localized recovery, session revocation, navigation and responsive rendering autonomously. Plan/Build: dedicated local CDP 9367, synthetic isolated UAT tenant, no business submissions. Test/Evidence: results.json and screenshots beside this report. Production foundation gate and release remain outside this local QA scope.\n\nDeferred: external email delivery (click default intercepted), MFA setup, real sale/payment and production release. Innovation: reusable fail-closed browser gate with identity-scoped fixture cleanup and no persisted credential artifacts.\n\n${redact(results).map(r=>'- '+r.status+' '+r.name+(r.error?' — '+r.error:r.reason?' — '+r.reason:'')).join('\n')}\n`);
  console.log(JSON.stringify({passed:summary.passed,failed:summary.failed,evidence:out}));process.exitCode=summary.failed?1:0;
}
