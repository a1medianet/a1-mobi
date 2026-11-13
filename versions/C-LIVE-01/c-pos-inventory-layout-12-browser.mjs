// Layout regression on top of canonical C-11 browser probe.
// Uses authenticated local UAT and saves only screenshots inside this project.
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const original=readFileSync(resolve("versions/C-LIVE-01/c-pos-inventory-canonical-11-browser.mjs"),"utf8");
const old=' \'  await capture(cdp,"c-canonical-11-"+locale+"-"+section+"-"+width);\',';
const probe='({main:Math.round(document.querySelector(".mobi-live01").getBoundingClientRect().width),workspace:Math.round(document.querySelector(".mobi-live-workspace").getBoundingClientRect().width),panels:[...document.querySelectorAll(".mobi-live-workspace>section")].map(x=>Math.round(x.getBoundingClientRect().width)),forms:[...document.querySelectorAll(".mobi-live01 .mobi-live-steps form")].map(x=>Math.round(x.getBoundingClientRect().width)),stats:[...document.querySelectorAll(".mobi-live-stats strong")].map(x=>Number(x.textContent)),mobile:innerWidth<=700})';
const addition=[
 '  const layout=await evaluate(cdp,'+JSON.stringify(probe)+');',
 '  assert(layout.main>0&&layout.workspace>=layout.main-70&&layout.panels.length===2&&layout.stats.some(x=>x>0),"Owner workspace not filled or UAT records unavailable "+JSON.stringify({section,locale,layout}));',
 '  if(width===1440){',
 '    if(section==="pos")assert(layout.panels.every(x=>x>=300),"Desktop POS did not occupy both columns "+JSON.stringify(layout));',
 '    else assert(layout.forms.every(x=>x>=300),"Desktop inventory forms not full width "+JSON.stringify(layout));',
 '  }else assert(layout.panels.every(x=>x>=290),"Mobile columns clipped "+JSON.stringify(layout));',
 '  console.log("C12_OWNER_WORKSPACE_LAYOUT_PASS",locale,section,JSON.stringify(layout));',
 '  await capture(cdp,"c-canonical-12-"+locale+"-"+section+"-"+width);'
].map(s=>" '"+s.replaceAll("\\","\\\\").replaceAll("'","\\'")+"',").join("\n");
if(!original.includes(old))throw new Error("Canonical QA baseline changed");
let transformed=original.replace(old,addition);
transformed=transformed.replaceAll("c-canonical-11-","c-canonical-12-").replaceAll("chrome-uat-canonical-11","chrome-uat-canonical-12").replaceAll("9241","9242").replaceAll(".c-canonical-11-transformed.mjs",".c-canonical-12-transformed.mjs");
const path=resolve("versions/C-LIVE-01/.c-canonical-12-wrapper.mjs");
writeFileSync(path,transformed,"utf8");
try{
 const check=spawnSync(process.execPath,["--check",path],{encoding:"utf8"});
 if(check.status!==0)throw new Error("C12 wrapper syntax error "+check.stderr.slice(0,900));
 await import(pathToFileURL(path).href);
}finally{unlinkSync(path);}
