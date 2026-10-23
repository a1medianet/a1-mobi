import { authJson } from "@/server/auth-http";
import { publicStoreCatalog } from "@/server/public-store";
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){
 try{
  const store=await publicStoreCatalog((await params).slug);
  if(!store)return authJson({error:"STORE_NOT_AVAILABLE"},404);
  return authJson({name:store.name,products:store.products});
 }catch{return authJson({error:"CATALOG_UNAVAILABLE"},503);}
}
