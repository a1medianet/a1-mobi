import "server-only";
import { db } from "@/server/db";
import {
  A1_CURRENCY_POLICY_KEY, safeCurrencyPolicy,
} from "@/modules/currency/currency-config";
import type { ManualQuote } from "@/modules/currency/currency-preview";

export async function loadCurrencyDesk(scope:{tenantId:string;branchId:string}) {
  const [tenant,setting,rates]=await Promise.all([
    db.tenant.findFirst({where:{id:scope.tenantId},select:{baseCurrency:true,defaultLocale:true}}),
    db.featureFlag.findUnique({where:{tenantId_key:{tenantId:scope.tenantId,key:A1_CURRENCY_POLICY_KEY}},select:{config:true}}),
    db.exchangeRate.findMany({where:{tenantId:scope.tenantId,branchId:scope.branchId},
      orderBy:[{effectiveAt:"desc"},{id:"desc"}],take:150,
      select:{baseCurrency:true,quoteCurrency:true,rate:true,effectiveAt:true}}),
  ]);
  if(!tenant)throw Error("TENANT_NOT_FOUND");
  const baseCurrency=tenant.baseCurrency;
  const policy=safeCurrencyPolicy(setting?.config,baseCurrency,tenant.defaultLocale);
  const visited=new Set<string>();
  const quotes:ManualQuote[]=[];
  for(const entry of rates){
    const base=entry.baseCurrency,quote=entry.quoteCurrency;
    if(!policy.allowedCurrencies.includes(base)||!policy.allowedCurrencies.includes(quote))continue;
    const id=base+"|"+quote;
    if(visited.has(id))continue;
    visited.add(id);
    quotes.push({base,quote,rate:entry.rate.toString(),effectiveAt:entry.effectiveAt.toISOString()});
  }
  return {baseCurrency,policy,quotes};
}
