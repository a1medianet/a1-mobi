// Local-only owner-authenticated real XLSX/CSV HTTP UAT with synthetic tenant.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const base = "http://127.0.0.1:3251";
const id = "import-http-" + Date.now();
const out = "docs/reviews/2026-10-26/" + id;
const secret = randomBytes(32).toString("hex");
const password = randomBytes(24).toString("hex");
const email = id + "@example.test";
const results = [];
let db, server, stage = "preflight";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pass = (name) => { results.push({name, status:"PASS"}); console.log("PASS " + name); };
async function ready(url, attempts = 460) {
  for(let i=0;i<attempts;i++) {
    try { if ((await fetch(url,{signal:AbortSignal.timeout(1500)})).ok) return; } catch {}
    await sleep(500);
  }
  throw Error("LOCAL_NEXT_NOT_READY");
}
try {
  assert.notEqual(process.env.NODE_ENV, "production");
  await mkdir(out,{recursive:true});
  const compose = await readFile("docker-compose.yml","utf8");
  const value = (key) => { const m=compose.match(new RegExp(key + ": ([^\\r\\n]+)")); assert.ok(m);return m[1].trim(); };
  const url=new URL("postgresql://127.0.0.1:5437/"+value("POSTGRES_DB"));
  url.username=value("POSTGRES_USER");url.password=value("POSTGRES_PASSWORD");
  url.searchParams.set("connect_timeout","5");
  assert.equal(url.hostname,"127.0.0.1");
  db=new PrismaClient({datasourceUrl:url.toString(),errorFormat:"minimal"});
  await db.$queryRaw`SELECT 1`;
  pass("local-postgres");
  let inUse=false;try{await fetch(base+"/en/login",{signal:AbortSignal.timeout(1000)});inUse=true;}catch{}
  assert.equal(inUse,false,"DEDICATED_PORT_IN_USE");
  server=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--webpack","--hostname","127.0.0.1","--port","3251"],{
    env:{...process.env,NODE_ENV:"development",DATABASE_URL:url.toString(),APP_ORIGIN:base,
      A1_MOBI_BOOTSTRAP_SECRET:secret,A1_MOBI_C_LIVE_01_ENABLED:"1",A1_MOBI_DIST_DIR:".local/a1-mobi-import-http-next"},
    stdio:"ignore",windowsHide:true,
  });
  server.on("error",()=>{});
  await ready(base+"/en/login");
  pass("local-app");
  stage="bootstrap";
  const boot=await fetch(base+"/api/bootstrap",{method:"POST",headers:{"content-type":"application/json","x-a1-bootstrap-secret":secret},
    body:JSON.stringify({tenantSlug:id,tenantName:"Synthetic import UAT",branchCode:"MAIN",branchName:"QA",ownerEmail:email,
      ownerDisplayName:"QA Owner",ownerPassword:password,locale:"en"})});
  assert.equal(boot.status,201,"BOOTSTRAP_FAILED");
  const fixture=(await boot.json()).bootstrap;
  stage="auth";
  const login=await fetch(base+"/api/auth/login",{method:"POST",headers:{"content-type":"application/json",origin:base},
    body:JSON.stringify({tenant:id,email,password})});
  assert.equal(login.status,200,"LOGIN_FAILED");
  const cookie=login.headers.get("set-cookie")?.split(";")[0];
  assert.match(cookie??"",/a1-mobi-session=/);
  pass("real-owner-login");
  stage="upload";
  const xlsx=await readFile("tests/fixtures/catalog-import.xlsx");
  const form=new FormData();
  form.set("file",new Blob([xlsx],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),"products.xlsx");
  const send=(body,extra={})=>fetch(base+"/api/ops/catalog/import",{method:"POST",headers:{origin:base,cookie,...extra},body});
  const created=await send(form);
  const first=await created.json();
  assert.equal(created.status,200,"XLSX_HTTP_FAILED");
  assert.equal(first.created,1);assert.equal(first.updated,0);
  const product=await db.product.findUniqueOrThrow({where:{tenantId_sku:{tenantId:fixture.tenantId,sku:"FIXTURE-001"}}});
  assert.equal(product.nameAr,"غطاء تجربة");
  assert.equal(await db.barcode.count({where:{tenantId:fixture.tenantId,productId:product.id,value:"FIXTURE0001"}}),1);
  pass("owner-real-xlsx-upload-db");
  stage="csv-update";
  const csv="category_code,sku,name_ar,name_en,type,barcode,cost,base_price,minimum_price,low_stock,serialized\nACCESSORY,FIXTURE-001,غطاء محدّث,Updated Case,ACCESSORY,FIXTURE0001,3,7,4,5,false";
  const updateForm=new FormData();
  updateForm.set("file",new Blob([csv],{type:"text/csv"}),"products.csv");
  const updated=await send(updateForm);
  assert.equal(updated.status,200,"CSV_UPDATE_FAILED");
  assert.equal((await updated.json()).updated,1);
  const revised=await db.product.findUniqueOrThrow({where:{id:product.id}});
  assert.equal(revised.nameAr,"غطاء محدّث");
  assert.equal(Number(revised.basePrice),7);
  pass("owner-real-csv-upsert-db");
  stage="access-denials";
  const outsider=new FormData();
  outsider.set("file",new Blob([csv]),"products.csv");
  const anonymous=await fetch(base+"/api/ops/catalog/import",{method:"POST",headers:{origin:base},body:outsider});
  assert.ok([401,403].includes(anonymous.status),"ANON_UPLOAD_NOT_DENIED");
  const hostile=new FormData();hostile.set("file",new Blob([csv]),"products.csv");
  const forbidden=await send(hostile,{origin:"https://untrusted.example"});
  assert.equal(forbidden.status,403,"FOREIGN_ORIGIN_NOT_DENIED");
  pass("unauthorized-and-foreign-origin-denied");
} catch (error) {
  process.exitCode=1;
  results.push({name:"integration",status:"FAIL",stage,code:error?.message?.replaceAll(password,"[REDACTED]")});
  console.log("FAIL " + stage + " " + error?.message?.replaceAll(password,"[REDACTED]"));
} finally {
  if (server?.pid) spawnSync("taskkill",["/PID",String(server.pid),"/T","/F"],{stdio:"ignore",windowsHide:true});
  await db?.$disconnect();
  await writeFile(out+"/results.json",JSON.stringify({status:process.exitCode?"INCOMPLETE":"PASS",checks:results,
    limits:["Synthetic local PostgreSQL owner and Next app","No production deployment or physical hardware"]},null,2));
  console.log("EVIDENCE "+out);
}
