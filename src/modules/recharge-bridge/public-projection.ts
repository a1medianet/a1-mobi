/**
 * Project Recharge service output before passing it to a store browser.
 * Supplier costs and margin are never client-visible without cost.read or
 * foundation.manage. Service credentials never leave the Mobi server.
 * This protection applies recursively to new nested upstream fields.
 */
const secretField=/(?:token|secret|credential|hmac|password|authorization|api[_-]?key|private[_-]?key)/i;
const financialField=/(?:cost|margin|profit|wholesale|purchase|supplier|vendor|payable|settlement)/i;

export function projectRechargeForStore<T>(value:T,canReadCosts:boolean):T{
 if(Array.isArray(value))
  return value.map(item=>projectRechargeForStore(item,canReadCosts)) as T;
 if(value===null||typeof value!=="object")return value;
 return Object.fromEntries(Object.entries(value as Record<string,unknown>)
  .filter(([field])=>!secretField.test(field)&&(canReadCosts||!financialField.test(field)))
  .map(([field,item])=>[field,projectRechargeForStore(item,canReadCosts)])) as T;
}

export function canViewRechargeCosts(permissions:ReadonlySet<string>){
 return permissions.has("cost.read")||permissions.has("foundation.manage");
}
