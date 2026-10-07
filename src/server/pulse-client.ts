import { createHmac } from "node:crypto";
import { appVersionInfo } from "@/core/version";

export type PulseDelivery={delivered:boolean;reason?:"not_configured"|"upstream_error";status?:number};

function pseudonymize(value:string|undefined){
  const salt=process.env.A1_TELEMETRY_HASH_SALT;
  if(!value||!salt||salt.length<24)return undefined;
  return createHmac("sha256",salt).update(value).digest("hex").slice(0,32);
}

async function deliver(url:string|undefined,payload:Record<string,unknown>):Promise<PulseDelivery>{
  const token=process.env.A1_PULSE_SERVICE_TOKEN;
  if(!url||!token)return {delivered:false,reason:"not_configured"};
  try{
    const response=await fetch(url,{
      method:"POST",
      headers:{authorization:"Bearer "+token,"content-type":"application/json"},
      body:JSON.stringify(payload),
      signal:AbortSignal.timeout(2500),
      cache:"no-store",
    });
    return response.ok?{delivered:true,status:response.status}:{delivered:false,reason:"upstream_error",status:response.status};
  }catch{return {delivered:false,reason:"upstream_error"}}
}

export async function sendHeartbeat(input:{
  installationId:string;
  route:string;
  tenantId?:string;
  branchId?:string;
}){
  return deliver(process.env.A1_PULSE_HEARTBEAT_URL,{
    event:"app.heartbeat",
    product:"a1-mobi",
    occurredAt:new Date().toISOString(),
    installationId:input.installationId,
    route:input.route,
    tenant:pseudonymize(input.tenantId),
    branch:pseudonymize(input.branchId),
    release:appVersionInfo(),
  });
}

export async function sendClientError(input:{
  digest?:string;
  route:string;
  installationId?:string;
  tenantId?:string;
  branchId?:string;
}){
  return deliver(process.env.A1_PULSE_ERROR_URL,{
    event:"app.client_error",
    product:"a1-mobi",
    occurredAt:new Date().toISOString(),
    digest:input.digest?.slice(0,128)||"unknown",
    route:input.route,
    installationId:input.installationId,
    tenant:pseudonymize(input.tenantId),
    branch:pseudonymize(input.branchId),
    release:appVersionInfo(),
  });
}
