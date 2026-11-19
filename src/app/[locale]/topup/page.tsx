import { notFound } from "next/navigation";
import { currentStoreContext } from "@/server/auth-http";
import TopupMethodWorkspace from "@/components/topup-method-workspace";
import {resolveRechargeSandboxMapping} from "@/modules/recharge-bridge/sandbox-config";
export const dynamic="force-dynamic";
export default async function TopupPage({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;
 if(locale!=="ar"&&locale!=="en")notFound();
 const ctx=await currentStoreContext("topup.manage");
 let enabled=false;
 try{resolveRechargeSandboxMapping(ctx.tenantId,ctx.branchId);enabled=true;}catch{enabled=false;}
 return <TopupMethodWorkspace locale={locale} integrationSandboxEnabled={enabled}
  reviewAllowed={ctx.permissions.has("foundation.manage")}
  cashAllowed={ctx.permissions.has("cash.manage")}
  costAllowed={ctx.permissions.has("cost.read")||ctx.permissions.has("foundation.manage")}/>;
}
