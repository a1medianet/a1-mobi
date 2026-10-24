// C-12 local synthetic UAT only. Do NOT run against an Internet host or live tenant.
// The script reads local credentials only in memory and never logs them.
import { readFileSync } from "node:fs";
import { randomInt, randomUUID } from "node:crypto";

const root="C:/A1Hub/a1-mobi/";
const env=Object.fromEntries(readFileSync(root+".env.local","utf8").split(/\r?\n/).filter(x=>/^[A-Za-z_][A-Za-z0-9_]*=/.test(x)).map(x=>{const index=x.indexOf("=");return [x.slice(0,index),x.slice(index+1).replace(/^['"]|['"]$/g,"")];}));
const dbUrl=new URL(env.DATABASE_URL||"http://invalid");
if(!["postgresql:","postgres:"].includes(dbUrl.protocol)||dbUrl.hostname!=="127.0.0.1"||dbUrl.port!=="5438"||dbUrl.pathname!=="/mobi_uat")throw new Error("UAT_DB_GUARD_FAILED");
if(env.A1_MOBI_C_LIVE_01_ENABLED!=="1")throw new Error("UAT_GATE_DISABLED");
const creds={};
for(const line of readFileSync(root+".local/techzone-owner-login.txt","utf8").split(/\r?\n/)){const i=line.indexOf(":");if(i>0)creds[line.slice(0,i).trim()]=line.slice(i+1).trim();}
const tenant=creds["Tenant / Store ID"];
if(!/^journey-[0-9]+$/.test(tenant))throw new Error("UAT_SYNTHETIC_TENANT_GUARD_FAILED");
const origin="http://127.0.0.1:3198";
const login=await fetch(origin+"/api/auth/login",{method:"POST",headers:{"content-type":"application/json","origin":origin},body:JSON.stringify({tenant,email:creds.Email,password:creds.Password})});
if(login.status!==200)throw new Error("UAT_LOGIN_STATUS_"+login.status);
const cookies=login.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");
if(!cookies)throw new Error("UAT_SESSION_COOKIE_MISSING");
const headers={cookie:cookies,origin,"content-type":"application/json"};
async function request(method,body){
 const r=await fetch(origin+"/api/ops/live-01",{method,headers,cache:"no-store",...(body?{body:JSON.stringify(body)}:{})});
 const data=await r.json();
 if(!r.ok)throw new Error("LIVE01_"+(body?.action||"GET")+"_"+r.status+"_"+String(data.error||""));
 return data;
}
function imei(){
 const prefix="35"+String(randomInt(0,1_000_000_000_000)).padStart(12,"0");
 let sum=0;
 for(let i=0;i<14;i++){let n=Number(prefix[i]);if(i%2===1){n*=2;if(n>9)n-=9;}sum+=n;}
 return prefix+String((10-sum%10)%10);
}
const sku="A1UAT-C12-SAMPLE";
let state=await request("GET");
let product=state.products.find(p=>p.sku===sku);
if(!product){
 const created=await request("POST",{action:"createProduct",sku,brand:"A1UAT",model:"Sample 12",variant:"128GB",nameAr:"هاتف عرض تجريبي",nameEn:"Sample test device",unitCost:110,price:240});
 if(!created.id||!created.variantId||!created.locationId)throw Error("PRODUCT_CREATION_INCOMPLETE");
 state=await request("GET");product=state.products.find(p=>p.id===created.id);
 if(!product)throw Error("PRODUCT_NOT_VISIBLE");
 console.log("UAT_SAMPLE_PRODUCT_REGISTERED",sku);
}
const variants=state.variants.filter(x=>x.model==="Sample 12"&&x.name==="128GB");
const location=state.locations.find(x=>x.name==="Store inventory");
if(variants.length!==1||!location)throw new Error("UAT_VARIANT_OR_STOCK_LOCATION_NOT_FOUND");
let devices=state.devices.filter(x=>x.productId===product.id);
for(let i=devices.length;i<2;i++){
 const added=await request("POST",{action:"receive",productId:product.id,variantId:variants[0].id,locationId:location.id,imei:imei(),unitCost:110,idempotencyKey:randomUUID()});
 if(!added.id)throw new Error("RECEIVE_INCOMPLETE");
 console.log("UAT_SAMPLE_RECEIVE_PASS",i+1);
}
state=await request("GET");devices=state.devices.filter(x=>x.productId===product.id);
if(!devices.some(x=>x.status==="SOLD")){
 const first=devices.find(x=>x.status==="IN_STOCK");
 if(!first)throw new Error("UAT_SAMPLE_DEVICE_NOT_AVAILABLE");
 const sold=await request("POST",{action:"sell",deviceId:first.id,idempotencyKey:randomUUID()});
 if(!/^INV-/.test(sold.invoiceNumber||""))throw new Error("UAT_INVOICE_MISSING");
 console.log("UAT_SAMPLE_SALE_AND_INVOICE_PASS");
}
const final=await request("GET");devices=final.devices.filter(x=>x.productId===product.id);
if(!devices.some(x=>x.status==="IN_STOCK")||!devices.some(x=>x.status==="SOLD")||!final.sales.some(x=>Number(x.total)===240))throw new Error("UAT_FLOW_FINAL_INVARIANT_FAILED");
console.log("C12_UAT_E2E_PASS",JSON.stringify({sampleSku:sku,available:devices.filter(x=>x.status==="IN_STOCK").length,sold:devices.filter(x=>x.status==="SOLD").length,invoices:final.sales.length,storeProducts:final.counts.products}));
