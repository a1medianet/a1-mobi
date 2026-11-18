import {z} from "zod";
import {authJson,sameOriginMutation} from "@/server/auth-http";
import {requestPlatformPasswordReset} from "@/server/platform-recovery";
export const runtime="nodejs";
const schema=z.object({email:z.email().max(254)}).strict();
export async function POST(request:Request){
 if(!sameOriginMutation(request))return authJson({error:"FORBIDDEN_ORIGIN"},403);
 const input=schema.safeParse(await request.json().catch(()=>null));
 if(!input.success)return authJson({error:"INVALID_REQUEST"},400);
 try{await requestPlatformPasswordReset(input.data.email);}
 catch{/* Deliberately no account, recovery email or delivery enumeration. */}
 return authJson({accepted:true},202);
}
