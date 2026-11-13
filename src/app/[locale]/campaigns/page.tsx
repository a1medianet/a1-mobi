import Link from "next/link";
import {notFound} from "next/navigation";
import {currentStoreContext} from "@/server/auth-http";
import {listEngagement} from "@/modules/engagement/engagement-store";
import EngagementPanel from "@/components/engagement-panel";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;if(locale!=="ar"&&locale!=="en")notFound();
  const ar=locale==="ar";
  const ctx=await currentStoreContext("foundation.manage");
  const records=await listEngagement({...ctx,type:"CAMPAIGN"});
  return <main className="module-page" dir={ar?"rtl":"ltr"}>
    <header className="module-header"><div>
      <Link className="back-link" href={"/"+locale+"/customers"}>{ar?"العملاء":"Customers"}</Link>
      <h1>{ar?"التسويق والحملات":"Marketing and campaigns"}</h1>
      <p className="module-sub">{ar?"جهّز حملاتك ورسائلك قبل اعتماد الإرسال.":"Prepare campaigns and review messages before sending."}</p>
    </div></header>
    <EngagementPanel locale={locale} type="CAMPAIGN" initial={records} customers={[]}/>
  </main>;
}
