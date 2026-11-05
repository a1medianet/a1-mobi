// Reuse the established authenticated VP05 browser harness; run only on local UAT.
// No customer data, credentials or screenshots are sent to external services.
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

let code = readFileSync(resolve("versions/C-LIVE-02/c-live-02-vp05-kpi-browser.mjs"), "utf8");
function replaceOnce(from, to) {
  if (!code.includes(from)) throw new Error("Browser baseline contract changed: " + from);
  code = code.replace(from, to);
}
replaceOnce('const address=origin+"/ar/live-02";', 'const address=origin+"/ar/repairs";');
code = code.replaceAll("9234", "9238");
code = code.replaceAll("chrome-uat-kpi-pass05", "chrome-uat-canonical-09");
code = code.replaceAll("c-live-02-vp05-", "c-live-02-canonical-09-");

const desktopProbe = '({path:location.pathname,active:[...document.querySelectorAll("a[aria-current=page]")].some(a=>a.getAttribute("href")==="/ar/repairs"),back:document.querySelector(".mobi-live02 .back-link")?.getAttribute("href"),live:!!document.querySelector(".mobi-live02-orders"),oldDemo:!!document.querySelector(".ops-metrics")})';
const mobileProbe = '({path:location.pathname,active:document.querySelector(".mobile-nav a[aria-current=page]")?.getAttribute("href")==="/ar/repairs",live:!!document.querySelector(".mobi-live02-orders")})';
const desktopLines = [
  ' const ownerNavigation=await evaluate(cdp,' + JSON.stringify(desktopProbe) + ');',
  ' assert(ownerNavigation.path==="/ar/repairs" && ownerNavigation.active && ownerNavigation.back==="/ar" && ownerNavigation.live && !ownerNavigation.oldDemo,"Canonical desktop repairs failed "+JSON.stringify(ownerNavigation));',
  ' console.log("C_REPAIRS_CANONICAL_DESKTOP_PASS",JSON.stringify(ownerNavigation));',
  ' const desktop=await evaluate(cdp,',
].join("\n");
const mobileLines = [
  ' const mobileNavigation=await evaluate(cdp,' + JSON.stringify(mobileProbe) + ');',
  ' assert(mobileNavigation.path==="/ar/repairs" && mobileNavigation.active && mobileNavigation.live,"Canonical mobile repairs failed "+JSON.stringify(mobileNavigation));',
  ' console.log("C_REPAIRS_CANONICAL_MOBILE_PASS",JSON.stringify(mobileNavigation));',
  ' const mobile=await evaluate(cdp,',
].join("\n");
replaceOnce(" const desktop=await evaluate(cdp,", desktopLines);
replaceOnce(" const mobile=await evaluate(cdp,", mobileLines);

const englishProbe = '({path:location.pathname,title:document.querySelector(".mobi-live02 .module-header h1")?.textContent,active:document.querySelector(".mobile-nav a[aria-current=page]")?.getAttribute("href")==="/en/repairs",rows:document.querySelectorAll(".mobi-live02-orders tbody tr").length,width:innerWidth,overflow:document.documentElement.scrollWidth})';
const englishLines = [
  ' await navigate(cdp,origin+"/en/repairs",390,844);',
  ' for(let i=0;i<80;i++){if(await evaluate(cdp,\'document.querySelectorAll(".mobi-live02-orders tbody tr").length>=5\'))break;await sleep(200);}',
  ' const english=await evaluate(cdp,' + JSON.stringify(englishProbe) + ');',
  ' assert(english.path==="/en/repairs" && english.title==="Repair orders" && english.active && english.rows>=5 && english.overflow<=english.width+2,"Canonical English mobile repairs failed "+JSON.stringify(english));',
  ' await capture(cdp,"c-live-02-canonical-09-english-mobile");',
  ' console.log("C_REPAIRS_CANONICAL_ENGLISH_MOBILE_PASS",JSON.stringify(english));',
  ' ws.close();',
].join("\n");
replaceOnce(" ws.close();", englishLines);

const temp=resolve("versions/C-LIVE-02/.canonical-09-transformed.mjs");
writeFileSync(temp,code,"utf8");
try {
  const result=spawnSync(process.execPath,["--check",temp],{encoding:"utf8"});
  if(result.status!==0)throw new Error("Canonical QA syntax failed: "+result.stderr.slice(0,900));
  await import(pathToFileURL(temp).href);
} finally {
  unlinkSync(temp);
}
