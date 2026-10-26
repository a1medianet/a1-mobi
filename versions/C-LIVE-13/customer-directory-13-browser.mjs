// C-13/02: authenticated read-only owner customer directory on local Thaghr.
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const base=readFileSync(resolve("versions/C-LIVE-02/c-live-02-vp05-kpi-browser.mjs"),"utf8");
const start=base.indexOf(' const address=origin+"/ar/live-02";');
const end=base.indexOf(" ws.close();",start);
if(start<0||end<start)throw new Error("Authenticated CDP base changed");
const steps=[
 ' const screens=[["ar",1440,900],["en",390,844]];',
 ' for(const [locale,width,height] of screens){',
 '  await navigate(cdp,origin+"/"+locale+"/customers",width,height);',
 '  for(let i=0;i<90;i++){',
 '   const ready=await evaluate(cdp,\'!!document.querySelector(".module-header h1")&&document.querySelectorAll(".ops-metrics .metric").length===2\');',
 '   if(ready)break;await sleep(220);',
 '  }',
 '  const snapshot=await evaluate(cdp,\'({path:location.pathname,title:document.querySelector(".module-header h1")?.textContent,metrics:document.querySelectorAll(".ops-metrics .metric").length,notice:document.querySelector(".preview-notice")?.textContent,table:!!document.querySelector(".activity-card tbody"),overflow:document.documentElement.scrollWidth,width:innerWidth})\');',
 '  assert(snapshot.path==="/"+locale+"/customers"&&snapshot.metrics===2&&snapshot.table&&snapshot.notice&&!snapshot.notice.includes("Pilot Demo")&&snapshot.overflow<=snapshot.width+2,"C13 CUSTOMERS UAT FAIL "+JSON.stringify(snapshot));',
 '  console.log("C13_CUSTOMERS_"+locale.toUpperCase()+"_PASS",JSON.stringify(snapshot));',
 '  await capture(cdp,"c13-customers-"+locale+"-"+width);',
 ' }',
].join("\n");
const transformed=(base.slice(0,start)+steps+"\n"+base.slice(end))
 .replaceAll("9234","9248").replaceAll("chrome-uat-kpi-pass05","chrome-uat-customers-13")
 .replaceAll("C:/A1Hub/a1-mobi/versions/C-LIVE-02\";","C:/A1Hub/a1-mobi/versions/C-LIVE-13\";");
const temp=resolve("versions/C-LIVE-13/.customers-13-transformed.mjs");
writeFileSync(temp,transformed,"utf8");
try{
 const result=spawnSync(process.execPath,["--check",temp],{encoding:"utf8"});
 if(result.status!==0)throw new Error("Browser syntax "+result.stderr.slice(0,1100));
 await import(pathToFileURL(temp).href);
}finally{unlinkSync(temp);}
