import {z} from "zod";
import {authJson,sameOriginMutation} from "@/server/auth-http";
import {resetPlatformPassword} from "@/server/platform-recovery";
export const runtime="nodejs";
const schema=z.object({
 token:z.string().regex(/^[A-Za-z0-9_-]{43}$/),
 newPassword:z.string().min(16).max(256),
 secondFactor:z.string().regex(/^\d{6}$/),
}).strict();
export async function POST(request:Request){
 if(!sameOriginMutation(request))return authJson({error:"FORBIDDEN_ORIGIN"},403);
 const input=schema.safeParse(await request.json().catch(()=>null));
 if(!input.success)return authJson({error:"INVALID_REQUEST"},400);
 try{return authJson(await resetPlatformPassword(input.data));}
 catch{return authJson({error:"INVALID_OR_EXPIRED_TOKEN"},400);}
}
