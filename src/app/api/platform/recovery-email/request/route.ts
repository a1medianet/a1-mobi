import {z} from "zod";
import {currentPlatformAdmin} from "@/server/platform-auth";
import {requestPlatformRecoveryEmailVerification,PlatformRecoveryError} from "@/server/platform-recovery";
import {authJson,sameOriginMutation} from "@/server/auth-http";
export const runtime="nodejs";
const schema=z.object({
 email:z.email().max(254),password:z.string().min(1).max(256),
 secondFactor:z.string().regex(/^\d{6}$/),
}).strict();
export async function POST(request:Request){
 if(!sameOriginMutation(request))return authJson({error:"FORBIDDEN_ORIGIN"},403);
 const admin=await currentPlatformAdmin();
 if(!admin)return authJson({error:"AUTH_REQUIRED"},401);
 if(!request.headers.get("content-type")?.startsWith("application/json"))
  return authJson({error:"INVALID_REQUEST"},400);
 const input=schema.safeParse(await request.json().catch(()=>null));
 if(!input.success)return authJson({error:"INVALID_REQUEST"},400);
 try{return authJson(await requestPlatformRecoveryEmailVerification({
  adminId:admin.id,...input.data,
 }),202);}
 catch(error){
  if(error instanceof PlatformRecoveryError){
   if(error.code==="INVALID_CONFIRMATION")return authJson({error:"INVALID_CONFIRMATION"},403);
   if(error.code==="INVALID_EMAIL")return authJson({error:"INVALID_EMAIL"},400);
  }
  return authJson({error:"RECOVERY_EMAIL_SETUP_UNAVAILABLE"},503);
 }
}
