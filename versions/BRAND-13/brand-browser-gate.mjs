// Authorized local browser UAT: check official identity in A and C. Read-only.
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const baseline=readFileSync(resolve("versions/C-LIVE-02/c-live-02-vp05-kpi-browser.mjs"),"utf8");
const start=baseline.indexOf(' const address=origin+"/ar/live-02";');
const end=baseline.indexOf(" ws.close();",start);
if(start<0||end<start)throw new Error("Chrome baseline changed");

const logoProbe='({path:location.pathname,brand:[...document.images].filter(i=>i.getAttribute("src")?.includes("brand/a1-mobi")).map(i=>({src:i.getAttribute("src"),loaded:i.complete&&i.naturalWidth>0,width:Math.round(i.getBoundingClientRect().width)})),overflow:document.documentElement.scrollWidth,width:innerWidth,techZoneBrand:!!document.querySelector(".mobi-shop-brand")})';
const actions=[
 ' const screens=[["/product/ar","A_AR",1440,900],["/product/en","A_EN",390,844],["/ar","C_AR",1440,900],["/en","C_EN",390,844]];',
 ' for(const [path,name,width,height] of screens){',
 '   await navigate(cdp,origin+path,width,height);',
 '   for(let n=0;n<70;n++){if(await evaluate(cdp,\'[...document.images].some(i=>i.getAttribute("src")?.includes("brand/a1-mobi")&&i.complete&&i.naturalWidth>0)\'))break;await sleep(200);}',
 '   const proof=await evaluate(cdp,'+JSON.stringify(logoProbe)+');',
 '   assert(proof.path===path&&proof.brand.some(x=>x.loaded&&x.width>(name.startsWith("A_")?100:30))&&proof.overflow<=proof.width+2&&!proof.techZoneBrand,"BRAND_GATE_FAILED "+JSON.stringify({name,proof}));',
 '   console.log("BRAND_13_"+name+"_PASS",JSON.stringify(proof));',
 '   await capture(cdp,"brand-13-"+name.toLowerCase());',
 '   if(name.startsWith("A_")){',
 '     await evaluate(cdp,\'document.querySelector(".product-footer")?.scrollIntoView()\');',
 '     for(let tries=0;tries<50;tries++){if(await evaluate(cdp,\'!!document.querySelector(".product-footer img")?.naturalWidth\'))break;await sleep(150);}',
 '     const negative=await evaluate(cdp,\'(()=>{const f=document.querySelector(".product-footer");const i=f?.querySelector("img");const badge=f?.querySelector(".footer-brand-asset");return {src:i?.getAttribute("src"),loaded:!!i?.naturalWidth,width:Math.round(i?.getBoundingClientRect().width||0),back:getComputedStyle(badge).backgroundColor}})()\');',
 '     assert(negative.src==="/brand/a1-mobi-logo-on-dark.svg"&&negative.loaded&&negative.width>100&&["transparent","rgba(0, 0, 0, 0)"].includes(negative.back),"BRAND_NEGATIVE_FOOTER_FAILED "+JSON.stringify(negative));',
 '     console.log("BRAND_13_"+name+"_NEGATIVE_FOOTER_PASS",JSON.stringify(negative));',
 '     await capture(cdp,"brand-13-footer-"+name.toLowerCase());',
 '   }',
 ' }',
 ' const manifestCheck=await evaluate(cdp,\'(async()=>{const a=await fetch("/manifest.webmanifest");const b=await fetch("/favicon.ico");const c=await fetch("/icon.png");const d=await fetch("/apple-icon.png");return {manifest:a.status,favicon:b.status,appIcon:c.status,apple:d.status}})()\');',
 ' assert(Object.values(manifestCheck).every(code=>code===200),"BRAND_METADATA_ASSETS_FAILED "+JSON.stringify(manifestCheck));',
 ' console.log("BRAND_13_FAVICON_MANIFEST_PASS",JSON.stringify(manifestCheck));'
].join("\n");
const derived=(baseline.slice(0,start)+actions+"\n"+baseline.slice(end))
.replaceAll("9234","9243")
.replaceAll("chrome-uat-kpi-pass05","chrome-uat-brand-13")
.replaceAll("C:/A1Hub/a1-mobi/versions/C-LIVE-02\";","C:/A1Hub/a1-mobi/versions/BRAND-13\";");
const temp=resolve("versions/BRAND-13/.brand-browser-transformed.mjs");
writeFileSync(temp,derived,"utf8");
try{
 const check=spawnSync(process.execPath,["--check",temp],{encoding:"utf8"});
 if(check.status!==0)throw new Error("Browser script syntax failed: "+check.stderr.slice(0,1000));
 await import(pathToFileURL(temp).href);
}finally{unlinkSync(temp);}
