// Thaghr-only read-only authenticated UI smoke: canonical C POS + inventory.
// Reuse the validated CDP/login harness without copying or changing private credentials.
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const base=readFileSync(resolve("versions/C-LIVE-02/c-live-02-vp05-kpi-browser.mjs"),"utf8");
const start=base.indexOf(' const address=origin+"/ar/live-02";');
const end=base.indexOf(" ws.close();",start);
if(start<0||end<start)throw new Error("Authenticated browser baseline changed");

const actions=[
 ' const paths=[["ar","pos",1440,900,1],["ar","inventory",1440,900,2],["en","pos",390,844,1],["en","inventory",390,844,2]];',
 ' for(const [locale,section,width,height,formCount] of paths){',
 '  const path="/"+locale+"/"+section;',
 '  await navigate(cdp,origin+path,width,height);',
 '  for(let retry=0;retry<65;retry++){',
 '   if(await evaluate(cdp,\'document.querySelectorAll(".mobi-live01 .mobi-live-steps form").length>0 && document.querySelectorAll(".mobi-live01 .mobi-live-stats article").length===2\'))break;',
 '   await sleep(180);',
 '  }',
 '  const snapshot=await evaluate(cdp,\'({path:location.pathname,title:document.querySelector(".mobi-live01 .module-header h1")?.textContent,forms:document.querySelectorAll(".mobi-live01 .mobi-live-steps form").length,stats:document.querySelectorAll(".mobi-live01 .mobi-live-stats article").length,demo:!!document.querySelector(".pos-grid,.ops-metrics"),width:innerWidth,overflow:document.documentElement.scrollWidth})\');',
 '  const api=await evaluate(cdp,\'(async()=>{const response=await fetch("/api/ops/live-01",{cache:"no-store"});return response.status})()\');',
 '  assert(snapshot.path===path&&snapshot.forms===formCount&&snapshot.stats===2&&!snapshot.demo&&api===200&&snapshot.overflow<=snapshot.width+2,"Canonical C "+path+" gate failed "+JSON.stringify({snapshot,api}));',
 '  console.log("C_LIVE_01_CANONICAL_"+section.toUpperCase()+"_"+locale.toUpperCase()+"_PASS",JSON.stringify(snapshot));',
 '  await capture(cdp,"c-canonical-11-"+locale+"-"+section+"-"+width);',
 ' }',
].join("\n");

const scripted=(base.slice(0,start)+actions+"\n"+base.slice(end))
 .replaceAll("9234","9241")
 .replaceAll("chrome-uat-kpi-pass05","chrome-uat-canonical-11")
 .replaceAll("C:/A1Hub/a1-mobi/versions/C-LIVE-02\";","C:/A1Hub/a1-mobi/versions/C-LIVE-01\";");
const temp=resolve("versions/C-LIVE-01/.c-canonical-11-transformed.mjs");
writeFileSync(temp,scripted,"utf8");
try{
 const check=spawnSync(process.execPath,["--check",temp],{encoding:"utf8"});
 if(check.status!==0)throw new Error("Browser syntax invalid: "+check.stderr.slice(0,1200));
 await import(pathToFileURL(temp).href);
}finally{unlinkSync(temp);}
