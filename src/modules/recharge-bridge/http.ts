/**
 * G5 server-only Recharge transport. Sandbox-only until OAuth2 and release gates.
 * Never auto-retry POST on network ambiguity.
 */
import {RechargeBridgeError} from "./receiver";

export function createRechargeSandboxTransport(input:{
 baseUrl:string;
 merchantId:string;branchId:string;
 getToken:()=>Promise<string>;
 requestFetch?:typeof fetch;
 timeoutMs?:number;
}){
 const endpoint=new URL(input.baseUrl);
 if(endpoint.username||endpoint.password||endpoint.search||endpoint.hash ||
    endpoint.pathname!=="/" || !(endpoint.protocol==="https:" ||
       (endpoint.protocol==="http:"&&["localhost","127.0.0.1"].includes(endpoint.hostname))))
   throw new RechargeBridgeError("UNSAFE_RECHARGE_ENDPOINT");
 if(!input.merchantId||!input.branchId)throw new RechargeBridgeError("MISSING_RECHARGE_SCOPE");
 const base=endpoint.origin;
 const timeoutMs=input.timeoutMs??8000;
 if(!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)
   throw new RechargeBridgeError("INVALID_RECHARGE_TIMEOUT");
 const transport=input.requestFetch??fetch;
 return async (path:string,request:{
   method:"GET"|"POST";idempotencyKey?:string;body?:unknown;
 }):Promise<unknown>=>{
   if(!path.startsWith("/v1/")||path.includes("#")||path.includes("..") ||
      !["GET","POST"].includes(request.method))
     throw new RechargeBridgeError("INVALID_RECHARGE_PATH");
   if(request.method==="POST"&&!request.idempotencyKey)
     throw new RechargeBridgeError("IDEMPOTENCY_KEY_REQUIRED");
   const token=await input.getToken();
   if(!token?.trim())throw new RechargeBridgeError("SERVICE_CREDENTIALS_UNAVAILABLE");
   const headers:Record<string,string>={
     accept:"application/vnd.a1-recharge.v1+json",
     authorization:"Bearer "+token,
     "x-a1-merchant-id":input.merchantId,
     "x-a1-branch-id":input.branchId,
   };
   if(request.idempotencyKey)headers["idempotency-key"]=request.idempotencyKey;
   if(request.body!==undefined)headers["content-type"]="application/json";
   let response:Response;
   try{
     response=await transport(base+path,{
       method:request.method,
       headers,
       body:request.body===undefined?undefined:JSON.stringify(request.body),
       redirect:"error",cache:"no-store",signal:AbortSignal.timeout(timeoutMs),
     });
   }catch{
     // An interrupted POST might already have been accepted remotely.
     throw new RechargeBridgeError("RECHARGE_OUTCOME_UNKNOWN");
   }
   let result:unknown;
   try{result=await response.json();}catch{
     throw new RechargeBridgeError("INVALID_RECHARGE_RESPONSE",response.status);
   }
   if(!response.ok){
     const error=result&&typeof result==="object"&&"error" in result
       ?(result as {error?:{code?:string}}).error:undefined;
     throw new RechargeBridgeError(error?.code??"RECHARGE_HTTP_ERROR",response.status);
   }
   return result;
 };
}
