// BRAND-14 acceptance: reuse previous authenticated browser gate on Thaghr UAT.
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const baseline=resolve("versions/BRAND-13/brand-browser-gate.mjs");
let body=readFileSync(baseline,"utf8");
function replaceOnce(oldText,newText){
 if(!body.includes(oldText))throw new Error("Previous brand gate contract changed: "+oldText);
 body=body.replace(oldText,newText);
}
replaceOnce('negative.src==="/brand/a1-mobi-logo-on-dark.svg"', 'negative.src==="/brand/a1-mobi-logo-white.svg"');
const insertion=[
 '   if(name==="C_AR"){',
 '     const sidebar=await evaluate(cdp,\'(()=>{const logo=document.querySelector(".sidebar .brand .a1-mobi-sidebar-logo");return {logo:logo?.getAttribute("src"),width:Math.round(logo?.getBoundingClientRect().width||0),loaded:!!logo?.naturalWidth,duplicate:!!document.querySelector(".sidebar .brand b")}})()\');',
 '     assert(sidebar.logo==="/brand/a1-mobi-logo-white.svg"&&sidebar.width>=140&&sidebar.loaded&&!sidebar.duplicate,"C_WHITE_SIDEBAR_FAILED "+JSON.stringify(sidebar));',
 '     console.log("BRAND_14_C_FULL_WHITE_SIDEBAR_PASS",JSON.stringify(sidebar));',
 '   }',
 '   if(name==="C_EN"){',
 '     const mobile=await evaluate(cdp,\'(()=>{const a=document.querySelector(".mobile-brand");const i=a?.querySelector("img");return {src:i?.getAttribute("src"),width:Math.round(i?.getBoundingClientRect().width||0),text:a?.textContent?.trim()}})()\');',
 '     assert(mobile.src==="/brand/a1-mobi-icon.svg"&&mobile.width>=30&&!mobile.text,"C_ICON_ONLY_MOBILE_FAILED "+JSON.stringify(mobile));',
 '     console.log("BRAND_14_C_ICON_ONLY_MOBILE_PASS",JSON.stringify(mobile));',
 '   }'
];
const insertionAsArrayEntries=insertion.map(line=>JSON.stringify(line)+",").join("\n");
replaceOnce(' \'   await capture(cdp,"brand-13-"+name.toLowerCase());\',',
 insertionAsArrayEntries+'\n \'   await capture(cdp,"brand-13-"+name.toLowerCase());\',');
body=body.replaceAll("brand-13-","brand-14-").replaceAll("BRAND_13_","BRAND_14_")
  .replaceAll("chrome-uat-brand-13","chrome-uat-brand-14").replaceAll("9243","9244")
  .replaceAll(".brand-browser-transformed.mjs",".brand-14-transformed.mjs");
// Wait for an on-screen logo rather than an offscreen/hidden lazy image.
body=body.replace(
 'i.getAttribute("src")?.includes("brand/a1-mobi")&&i.complete&&i.naturalWidth>0',
 'i.getAttribute("src")?.includes("brand/a1-mobi")&&i.getBoundingClientRect().width>20&&i.complete&&i.naturalWidth>0'
);
const temp=resolve("versions/BRAND-13/.brand-14-browser-wrapper.mjs");
writeFileSync(temp,body,"utf8");
try{
 const verify=spawnSync(process.execPath,["--check",temp],{encoding:"utf8"});
 if(verify.status!==0)throw new Error("BRAND-14 browser syntax failed: "+verify.stderr.slice(0,1200));
 await import(pathToFileURL(temp).href);
} finally { unlinkSync(temp); }
