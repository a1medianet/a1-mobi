/**
 * Strict, server-only G5 test mapping. No production tenant mapping defaults.
 * Never import this module into a client component or expose credentials in JSON.
 */
import {RechargeBridgeError} from "./receiver";

export type RechargeSandboxMapping={
  tenantId:string;branchId:string;merchantId:string;rechargeBranchId:string;token:string;
};
const identifier=(s:unknown)=>typeof s==="string"&&/^[A-Za-z0-9_-]{1,128}$/.test(s);

export function resolveRechargeSandboxMapping(
  tenantId:string,branchId:string,env:Record<string,string|undefined>=process.env,
):{baseUrl:string;mapping:RechargeSandboxMapping}{
  if(env.A1_MOBI_RECHARGE_ADAPTER_ENABLED!=="true"||
    env.A1_RECHARGE_SANDBOX_ONLY!=="true"||
    env.A1_MOBI_RECHARGE_REAL_MONEY_ENABLED==="1")
    throw new RechargeBridgeError("RECHARGE_SANDBOX_DISABLED",403);
  const baseUrl=env.A1_RECHARGE_API_BASE_URL;
  if(!baseUrl)throw new RechargeBridgeError("RECHARGE_ENDPOINT_UNCONFIGURED",503);
  const endpoint=new URL(baseUrl);
  if(endpoint.protocol!=="http:"||!["127.0.0.1","localhost"].includes(endpoint.hostname)||
    endpoint.pathname!=="/"||endpoint.username||endpoint.password||endpoint.search||endpoint.hash)
    throw new RechargeBridgeError("RECHARGE_TEST_ENDPOINT_MUST_BE_LOOPBACK",503);
  let mappings:unknown;
  try{mappings=JSON.parse(env.A1_MOBI_RECHARGE_SANDBOX_MAPPINGS_JSON??"[]");}
  catch{throw new RechargeBridgeError("RECHARGE_MAPPING_INVALID",503);}
  if(!Array.isArray(mappings)||mappings.length!==2)
    throw new RechargeBridgeError("RECHARGE_MAPPING_INVALID",503);
  const typed=mappings as Partial<RechargeSandboxMapping>[];
  if(typed.some(m=>!identifier(m.tenantId)||!identifier(m.branchId)||
    !identifier(m.merchantId)||!identifier(m.rechargeBranchId)||
    typeof m.token!=="string"||m.token.length<12))
    throw new RechargeBridgeError("RECHARGE_MAPPING_INVALID",503);
  const distinct=new Set(typed.map(m=>m.tenantId+":"+m.branchId));
  const remoteDistinct=new Set(typed.map(m=>m.merchantId+":"+m.rechargeBranchId));
  if(distinct.size!==2||remoteDistinct.size!==2)
    throw new RechargeBridgeError("RECHARGE_MAPPING_NOT_ISOLATED",503);
  const match=typed.find(m=>m.tenantId===tenantId&&m.branchId===branchId);
  if(!match)throw new RechargeBridgeError("RECHARGE_MERCHANT_NOT_ENROLLED",403);
  return {baseUrl,mapping:match as RechargeSandboxMapping};
}
