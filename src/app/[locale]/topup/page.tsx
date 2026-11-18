import { notFound } from "next/navigation";
import { currentStoreContext } from "@/server/auth-http";
import TopupOwnerLive from "@/components/topup-owner-live";
import RechargeG5Sandbox from "@/components/recharge-g5-sandbox";
export const dynamic="force-dynamic";
export default async function TopupPage({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;
 if(locale!=="ar"&&locale!=="en")notFound();
 await currentStoreContext("topup.manage");
 const enabled=process.env.A1_MOBI_RECHARGE_ADAPTER_ENABLED==="true" &&
  process.env.A1_RECHARGE_SANDBOX_ONLY==="true";
 return <><TopupOwnerLive locale={locale}/>{enabled&&<RechargeG5Sandbox locale={locale}/>}</>;
}
