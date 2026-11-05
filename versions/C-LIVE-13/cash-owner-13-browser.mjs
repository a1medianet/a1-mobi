// C-13/01: authenticated read-only owner cash visual gate on Thaghr UAT.
// Reuse the established login/CDP harness. No drawer writes or financial mutations.
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const base=readFileSync(resolve("versions/C-LIVE-02/c-live-02-vp05-kpi-browser.mjs"),"utf8");
const start=base.indexOf(' const address=origin+"/ar/live-02";');
const end=base.indexOf(" ws.close();",start);
if(start<0||end<start)throw new Error("Owner UAT browser baseline changed");
const steps=[
 ' const screens=[["ar",1440,900],["en",390,844]];',
 ' for(const [locale,width,height] of screens){',
 '  await navigate(cdp,origin+"/"+locale+"/cash",width,height);',
 '  for(let i=0;i<95;i++){',
 '   const ready=await evaluate(cdp,\'!!document.querySelector(".module-header h1")&&!!document.querySelector(".ops-metrics .metric")\');',
 '   if(ready)break;await sleep(200);',
 '  }',
 '  const proof=await evaluate(cdp,\'({path:location.pathname,title:document.querySelector(".module-header h1")?.textContent,metrics:document.querySelectorAll(".ops-metrics .metric").length,notice:document.querySelector(".preview-notice")?.textContent,body:document.body.textContent.slice(0,5000),overflow:document.documentElement.scrollWidth,width:innerWidth})\');',
 '  assert(proof.path==="/"+locale+"/cash"&&proof.metrics===4&&proof.notice&&!proof.notice.includes("Pilot Demo")&&!proof.notice.includes("synthetic")&&proof.overflow<=proof.width+2,"C13 OWNER CASH CANONICAL FAIL "+JSON.stringify({locale,proof}));',
 '  assert(!proof.body.includes("Application error")&&!proof.body.includes("Internal Server Error"),"Cash database unavailable "+locale);',
 '  console.log("C13_CASH_OWNER_"+locale.toUpperCase()+"_PASS",JSON.stringify({title:proof.title,metrics:proof.metrics,notice:proof.notice,overflow:proof.overflow,width:proof.width}));',
 '  await capture(cdp,"c13-cash-owner-"+locale+"-"+width);',
 ' }'
].join("\n");
const transformed=(base.slice(0,start)+steps+"\n"+base.slice(end))
 .replaceAll("9234","9247").replaceAll("chrome-uat-kpi-pass05","chrome-uat-cash-13")
 .replaceAll("C:/A1Hub/a1-mobi/versions/C-LIVE-02\";","C:/A1Hub/a1-mobi/versions/C-LIVE-13\";");
const temp=resolve("versions/C-LIVE-13/.cash-owner-13-transformed.mjs");
writeFileSync(temp,transformed,"utf8");
try{
 const result=spawnSync(process.execPath,["--check",temp],{encoding:"utf8"});
 if(result.status!==0)throw new Error("Browser script invalid "+result.stderr.slice(0,1200));
 await import(pathToFileURL(temp).href);
}finally{unlinkSync(temp);}
