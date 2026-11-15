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
  if(!["trialing","active"].includes(snapshot.status)) return false;
  if(snapshot.expiresAt){
    const end=Date.parse(snapshot.expiresAt);
    if(!Number.isFinite(end)||end<=Date.now()) return false;
  }
  return snapshot.features[feature]==="true";
}

/** Billing commit 1117b60 seeds mobi.users / mobi.branches; retain older keys. */
export function mobiEntitlementLimit(snapshot:MobiEntitlementSnapshot,kind:"users"|"branches"){
  if(!["trialing","active"].includes(snapshot.status)) return 0;
  if(snapshot.expiresAt){
    const end=Date.parse(snapshot.expiresAt);
    if(!Number.isFinite(end)||end<=Date.now()) return 0;
  }
  const candidates=kind==="users"?["mobi.users","staff.max"]:["mobi.branches","branches.max"];
  const raw=candidates.map(key=>snapshot.features[key]).find(v=>v!==undefined);
  const value=Number(raw);
  return Number.isSafeInteger(value)&&value>0?value:0;
}

export async function createMobiCheckout(input:{
  tenantId:string;
  planCode:"mobi-monthly"|"mobi-annual";
  email:string;
  returnUrl:string;
}){
  const response=await billingRequest("/api/checkout",{
    method:"POST",
    body:JSON.stringify({
      tenantId:input.tenantId,productKey:"mobi",planCode:input.planCode,
      email:input.email,returnUrl:input.returnUrl,
    }),
  });
  const urlString=response?.checkoutUrl;
  const checkoutId=response?.checkoutId;
  const permitted=process.env.A1_BILLING_CHECKOUT_ORIGIN||process.env.A1_BILLING_CORE_URL;
  if(typeof urlString!=="string"||typeof checkoutId!=="string"||!permitted)
    throw new Error("CHECKOUT_URL_INVALID");
  try{
    const url=new URL(urlString);
    if(url.origin!==new URL(permitted).origin||
       url.pathname!=="/checkout/mobi"||
       url.searchParams.get("r")!==checkoutId||
       !checkoutId.trim()||url.username||url.password)
      throw new Error("CHECKOUT_URL_INVALID");
  }catch{throw new Error("CHECKOUT_URL_INVALID");}
  return {checkoutId,checkoutUrl:urlString};
}
