export type MobiEntitlementSnapshot={
  tenantId:string;
  productKey:string;
  planCode?:string;
  status:string;
  features:Record<string,string>;
  expiresAt?:string;
};

function config(){
  const base=process.env.A1_BILLING_CORE_URL?.replace(/\/$/,"");
  const token=process.env.A1_BILLING_SERVICE_TOKEN;
  if(!base||!token) return null;
  return {base,token};
}

async function billingRequest(path:string,init?:RequestInit){
  const cfg=config();
  if(!cfg) throw new Error("A1_BILLING_NOT_CONFIGURED");
  const response=await fetch(cfg.base+path,{
    ...init,
    headers:{
      authorization:"Bearer "+cfg.token,
      "content-type":"application/json",
      ...(init?.headers||{}),
    },
    cache:"no-store",
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok){
    const code=typeof body?.error==="string"?body.error:"A1_BILLING_UNAVAILABLE";
    throw new Error(code);
  }
  return body;
}

export async function startMobiTrial(billingTenantKey:string){
  const body=await billingRequest("/api/trials",{
    method:"POST",
    body:JSON.stringify({tenantId:billingTenantKey,productKey:"mobi",planCode:"mobi-pilot"}),
  });
  return body.entitlement as MobiEntitlementSnapshot;
}

export async function getMobiEntitlements(billingTenantKey:string){
  const body=await billingRequest(
    "/api/entitlements?tenant="+encodeURIComponent(billingTenantKey)+"&product=mobi",
    {method:"GET"},
  );
  return body as MobiEntitlementSnapshot;
}

export function featureEnabled(snapshot:MobiEntitlementSnapshot,feature:string){
  return snapshot.features[feature]==="true";
}
