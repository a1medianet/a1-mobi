import {randomUUID} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";

const base=process.env.APP_ORIGIN || "http://127.0.0.1:3221";
const secret=process.env.A1_MOBI_BOOTSTRAP_SECRET;
if(!secret || secret.length<32)throw new Error("BOOTSTRAP_SECRET_UNAVAILABLE");
const sections={
  A:["/product/ar","/product/en","/product/ar/demo","/product/en/demo","/product/ar/pricing","/product/ar/help","/product/ar/security","/product/ar/privacy","/product/ar/terms","/product/ar/status","/product/ar/signup"],
  B:["/store-preview"],
  C:["/ar","/en","/ar/admin","/ar/pos","/ar/products","/ar/inventory","/ar/repairs","/ar/customers","/ar/cash","/ar/topup","/ar/device-trust","/ar/reports","/ar/settings/team","/ar/settings/security","/ar/account"]
};
const report={date:"2026-10-19",build:"isolated .next-c15",base:"localhost on Thaghr only",sections:{},issues:[],note:"All accounts used by this test are synthetic; no public production release."};
async function request(path,options={}){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);try{return await fetch(base+path,{redirect:"manual",signal:controller.signal,...options});}finally{clearTimeout(timer)}}
async function hit(path,cookie){const response=await request(path,cookie?{headers:{cookie}}:{});const type=response.headers.get("content-type")||"";const body=type.includes("text/html")?await response.text():"";return {path,status:response.status,location:response.headers.get("location")||undefined,bytes:body.length,html:body,contentType:type};}
function record(section,item){const result={path:item.path,status:item.status,location:item.location,htmlBytes:item.bytes};report.sections[section].push(result);if(item.status!==200){report.issues.push({section,path:item.path,status:item.status});}}
for(const group of ["A","B"]) {report.sections[group]=[];for(const path of sections[group])record(group,await hit(path));}
const now=randomUUID().slice(0,10),tenant="abc-audit-"+now,email="owner-"+now+"@example.test",password="Synthetic-audit-password-"+randomUUID();
const boot=await request("/api/bootstrap",{method:"POST",headers:{"content-type":"application/json","x-a1-bootstrap-secret":secret},body:JSON.stringify({tenantSlug:tenant,tenantName:"ABC Audit",branchCode:"MAIN",branchName:"Test Branch",ownerEmail:email,ownerDisplayName:"Audit Owner",ownerPassword:password,locale:"ar"})});
if(boot.status!==201)throw new Error("AUDIT_BOOTSTRAP_FAILED_"+boot.status);
const login=await request("/api/auth/login",{method:"POST",headers:{"content-type":"application/json",origin:base},body:JSON.stringify({tenant,email,password})});
if(login.status!==200)throw new Error("AUDIT_LOGIN_FAILED_"+login.status);
const cookie=(login.headers.get("set-cookie")||"").split(";")[0];
if(!cookie.includes("="))throw new Error("AUDIT_SESSION_COOKIE_MISSING");
report.sections.C=[];
for(const path of sections.C){
 const guest=await hit(path);
 if(![307,308].includes(guest.status)){report.issues.push({section:"C",path,kind:"GUEST_NOT_REDIRECTED",status:guest.status});}
 const page=await hit(path,cookie);record("C",page);
}
const product=await hit("/product/ar");
const links=[...product.html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(x=>x[1]).filter(x=>x.startsWith("/"));
const critical=["/store-preview","/product/ar/signup","/product/ar/demo","/product/ar/pricing"];
for(const target of critical)if(!links.some(link=>link===target||link.startsWith(target+"#")))report.issues.push({section:"A",kind:"CRITICAL_LINK_MISSING",target});
const store=await hit("/store-preview");
for(const id of ["products","services","about-store","store-contact"])if(!store.html.includes('id="'+id+'"'))report.issues.push({section:"B",kind:"SECTION_MISSING",id});
report.counts=Object.fromEntries(Object.entries(report.sections).map(([k,v])=>[k,{checked:v.length,ok:v.filter(x=>x.status===200).length}]));
report.status=report.issues.length?"FAIL":"PASS";
await mkdir("docs/reviews/2026-10-19/abc-audit",{recursive:true});
await writeFile("docs/reviews/2026-10-19/abc-audit/route-audit.json",JSON.stringify(report,null,2)+"\n");
console.log("ABC_ROUTE_AUDIT",JSON.stringify({status:report.status,counts:report.counts,issues:report.issues}));
if(report.issues.length)process.exitCode=1;
