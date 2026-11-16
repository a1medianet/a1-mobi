import { notFound } from "next/navigation";
import { currentStoreContext } from "@/server/auth-http";
import TopupOwnerLive from "@/components/topup-owner-live";
export const dynamic="force-dynamic";
export default async function TopupPage({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;
 if(locale!=="ar"&&locale!=="en")notFound();
 await currentStoreContext("topup.manage");
 return <TopupOwnerLive locale={locale}/>;
}
