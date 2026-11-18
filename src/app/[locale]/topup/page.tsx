import { notFound } from "next/navigation";
import { currentStoreContext } from "@/server/auth-http";
import TopupOwnerLive from "@/components/topup-owner-live";
import RechargeG5Sandbox from "@/components/recharge-g5-sandbox";
import {resolveRechargeSandboxMapping} from "@/modules/recharge-bridge/sandbox-config";
export const dynamic="force-dynamic";
export default async function TopupPage({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;
 if(locale!=="ar"&&locale!=="en")notFound();
 const ctx=await currentStoreContext("topup.manage");
 let enabled=false;
 try{resolveRechargeSandboxMapping(ctx.tenantId,ctx.branchId);enabled=true;}catch{enabled=false;}
 return <><TopupOwnerLive locale={locale} integrationSandboxEnabled={enabled}/>{enabled&&<RechargeG5Sandbox locale={locale}/>}</>;
}
