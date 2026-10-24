/**
 * Reproducible synthetic visual UAT data for the authorized local TechZone tenant.
 * Requires A1_MOBI_UAT_SEED_ALLOWED=1 and an isolated PostgreSQL "mobi_uat" database
 * at 127.0.0.1. Not part of the application runtime or public deployment.
 * No secrets are logged, embedded, or committed.
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
const root=process.cwd();
if(process.env.A1_MOBI_UAT_SEED_ALLOWED!=="1")throw Error("SEED_DISABLED");
const source=readFileSync(path.join(root,".env.local"),"utf8")
 .split(/\r?\n/).find(x=>x.startsWith("DATABASE_URL="));
if(!source)throw Error("LOCAL_DATABASE_CONFIG_MISSING");
const dbUrl=new URL(source.slice("DATABASE_URL=".length).replace(/^postgresql:/,"http:"));
if(dbUrl.hostname!=="127.0.0.1"||dbUrl.pathname!=="/mobi_uat")
 throw Error("REFUSING_NON_UAT_DATABASE");
const origin="http://127.0.0.1:3198";
const credentials={};
for(const line of readFileSync(path.join(root,".local","techzone-owner-login.txt"),"utf8").split(/\r?\n/)){
 const pos=line.indexOf(":");
 if(pos>0)credentials[line.slice(0,pos).trim()]=line.slice(pos+1).trim();
}
const tenant=credentials["Tenant / Store ID"],email=credentials.Email,password=credentials.Password;
if(!tenant||!email||!password)throw Error("LOCAL_UAT_OWNER_FILE_INVALID");
const login=await fetch(origin+"/api/auth/login",{
 method:"POST",headers:{"content-type":"application/json","origin":origin},
 body:JSON.stringify({tenant,email,password}),
});
if(!login.ok)throw Error("LOCAL_UAT_LOGIN_"+login.status);
const cookies=login.headers.getSetCookie().map(x=>x.split(";")[0]).filter(Boolean).join("; ");
if(!cookies)throw Error("AUTH_COOKIE_MISSING");
const headers={"content-type":"application/json",origin,cookie:cookies};
async function get(){
 const response=await fetch(origin+"/api/ops/live-02",{headers:{cookie:cookies},cache:"no-store"});
 if(!response.ok)throw Error("UAT_READ_"+response.status);
 return await response.json();
}
async function write(data){
 const response=await fetch(origin+"/api/ops/live-02",{method:"POST",headers,body:JSON.stringify(data)});
 const output=await response.json();
 if(!response.ok)throw Error("UAT_ACTION_"+data.action+"_"+response.status+"_"+String(output.error||""));
 return output;
}
function validImei(n){
 const base=String(n).padStart(14,"0");
 let sum=0;
 for(let index=0;index<base.length;index++){
  let digit=Number(base[index]);
  if(index%2===1){digit*=2;if(digit>9)digit-=9;}
  sum+=digit;
 }
 return base+((10-(sum%10))%10);
}
const marker="[UAT-VISUAL-02]";
const cases=[
 {key:"A",name:marker+" Customer A",device:"Samsung Galaxy S24",issue:"Screen replacement",target:"INTAKE",estimate:95},
 {key:"B",name:marker+" Customer B",device:"iPhone 15 Pro",issue:"Battery replacement",target:"ESTIMATE_PENDING",estimate:70},
 {key:"C",name:marker+" Customer C",device:"Xiaomi 13",issue:"Charging connector",target:"IN_PROGRESS",estimate:45},
 {key:"D",name:marker+" Customer D",device:"Google Pixel 8",issue:"Camera repair",target:"READY",estimate:120},
];
let created=0,existing=0;
for(let i=0;i<cases.length;i++){
 const testcase=cases[i];
 const snapshot=await get();
 const found=snapshot.orders.find(x=>x.customerName===testcase.name);
 if(found){existing++;continue;}
 // Synthetic test-only IMEIs: Luhn valid; no known real device IMEI is copied.
 const imei=validImei("8600000008"+String(i+11).padStart(4,"0"));
 const intake=await write({action:"intake",customerName:testcase.name,
  customerPhone:"+9617000"+String(i+101).padStart(4,"0"),
  deviceDescription:testcase.device,imei,condition:"UAT visual sample: device received",
  reportedIssue:"[UAT] "+testcase.issue,accessories:[]});
 created++;
 if(testcase.target==="INTAKE")continue;
 const id=intake.id;
 await write({action:"estimate",repairId:id,diagnosis:"[UAT] "+testcase.issue+" confirmed",estimateAmount:testcase.estimate});
 if(testcase.target==="ESTIMATE_PENDING")continue;
 await write({action:"approve",repairId:id});
 await write({action:"start",repairId:id});
 if(testcase.target==="IN_PROGRESS")continue;
 await write({action:"ready",repairId:id,finalPrice:testcase.estimate,laborCost:10,directCost:10});
}
const verified=await get();
const summary=Object.fromEntries(cases.map(c=>{
 const row=verified.orders.find(x=>x.customerName===c.name);
 return [c.key,row?.status??"MISSING"];
}));
if(cases.some(c=>summary[c.key]!==c.target))throw Error("SYNTHETIC_SAMPLE_VERIFICATION_FAILED");
console.log("LOCAL_UAT_SAMPLES_OK",JSON.stringify({created,alreadyPresent:existing,status:summary,totalList:verified.orders.length}));
