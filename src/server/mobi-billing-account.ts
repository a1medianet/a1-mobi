export type MobiBillingAccount = {
  entitlement: {
    tenantId: string; productKey: string; status: string;
    planCode?: string; expiresAt?: string; features: Record<string,string>;
  };
  plan: null | {name:string;currency:string;amountMinor:number;interval:string};
  renewal: {autoRenew:boolean|null;canChange:boolean;effectiveAt?:string;nextPaymentAt?:string};
};

/** Distinct scoped account token; never use the broad service token for customer account. */
async function requestAccount(tenantId:string, autoRenew?:boolean):Promise<MobiBillingAccount> {
  const base=process.env.A1_BILLING_CORE_URL?.replace(/\/$/,"");
  const token=process.env.A1_BILLING_MOBI_ACCOUNT_TOKEN;
  if(!base||!token) throw new Error("A1_BILLING_ACCOUNT_NOT_CONFIGURED");
  const changing=typeof autoRenew==="boolean";
  const response=await fetch(
    base+(changing?"/api/customer/account":"/api/customer/account?tenant="+encodeURIComponent(tenantId)+"&product=mobi"),
    {
      method:changing?"POST":"GET",
      headers:{authorization:"Bearer "+token,"content-type":"application/json"},
      ...(changing?{body:JSON.stringify({tenantId,productKey:"mobi",autoRenew})}:{}),
      cache:"no-store",
      signal:AbortSignal.timeout(12000),
    },
  );
  const body=await response.json().catch(()=>({}));
  if(!response.ok){
    if(response.status===409) throw new Error("RENEWAL_CHANGE_NOT_ALLOWED");
    if(response.status===401||response.status===403) throw new Error("BILLING_ACCOUNT_AUTH_FAILED");
    throw new Error("BILLING_ACCOUNT_UNAVAILABLE");
  }
  if(changing) {
    if(!body?.renewal||body.renewal.autoRenew!==autoRenew) throw new Error("RENEWAL_NOT_CONFIRMED");
    return getMobiBillingAccount(tenantId);
  }
  if(!body?.entitlement||body.entitlement.tenantId!==tenantId||
     body.entitlement.productKey!=="mobi"||!body.renewal)
    throw new Error("BILLING_ACCOUNT_SCOPE_MISMATCH");
  return body as MobiBillingAccount;
}

export function getMobiBillingAccount(tenantId:string){return requestAccount(tenantId);}
export function setMobiAutoRenew(tenantId:string,autoRenew:boolean){return requestAccount(tenantId,autoRenew);}
