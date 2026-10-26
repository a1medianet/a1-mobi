// C-13/03: read-only branch report, authenticated local Chrome.
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
const base=readFileSync(resolve("versions/C-LIVE-02/c-live-02-vp05-kpi-browser.mjs"),"utf8");
const start=base.indexOf(' const address=origin+"/ar/live-02";');
const end=base.indexOf(" ws.close();",start);
if(start<0||end<start)throw Error("Base CDP UAT contract changed");
const steps=[
 ' const screens=[["ar",1440,900],["en",390,844]];',
 ' for(const [locale,width,height] of screens){',
 '  for(let attempt=0;attempt<4;attempt++){',
 '   await navigate(cdp,origin+"/"+locale+"/reports",width,height);',
 '   for(let i=0;i<75;i++){',
 '    if(await evaluate(cdp,\'document.querySelectorAll(".report-grid .report-card").length===9\'))break;',
 '    await sleep(200);',
 '   }',
 '   if(await evaluate(cdp,\'document.querySelectorAll(".report-grid .report-card").length===9\'))break;',
 '   await sleep(1000);',
 '  }',
 '  const proof=await evaluate(cdp,\'({path:location.pathname,title:document.querySelector(".module-header h1")?.textContent,cards:document.querySelectorAll(".report-grid .report-card").length,notice:document.querySelector(".preview-notice")?.textContent,overflow:document.documentElement.scrollWidth,width:innerWidth})\');',
 '  assert(proof.path==="/"+locale+"/reports"&&proof.cards===9&&proof.notice&&!proof.notice.includes("Pilot Demo")&&proof.overflow<=proof.width+2,"C13 BRANCH REPORT SCREEN FAILED "+JSON.stringify(proof));',
 '  console.log("C13_BRANCH_REPORT_"+locale.toUpperCase()+"_PASS",JSON.stringify(proof));',
 '  await capture(cdp,"c13-reports-"+locale+"-"+width);',
 ' }',
].join("\n");
const transformed=(base.slice(0,start)+steps+"\n"+base.slice(end))
 .replaceAll("9234","9249").replaceAll("chrome-uat-kpi-pass05","chrome-uat-report-13")
 .replaceAll("C:/A1Hub/a1-mobi/versions/C-LIVE-02\";","C:/A1Hub/a1-mobi/versions/C-LIVE-13\";");
const temp=resolve("versions/C-LIVE-13/.report-13-transformed.mjs");
writeFileSync(temp,transformed,"utf8");
try{
 const test=spawnSync(process.execPath,["--check",temp],{encoding:"utf8"});
 if(test.status!==0)throw Error("Report Chrome syntax "+test.stderr.slice(0,1000));
 await import(pathToFileURL(temp).href);
}finally{unlinkSync(temp);}
