import Link from "next/link";
import {notFound} from "next/navigation";
import {currentStoreContext} from "@/server/auth-http";
import {db} from "@/server/db";
import {listEngagement} from "@/modules/engagement/engagement-store";
import EngagementPanel from "@/components/engagement-panel";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;if(locale!=="ar"&&locale!=="en")notFound();
  const ar=locale==="ar",type="FOLLOWUP" as const;
  const ctx=await currentStoreContext("foundation.manage");
  const [records,customers]=await Promise.all([
    listEngagement({...ctx,type}),
    type==="FOLLOWUP"?db.customer.findMany({where:{tenantId:ctx.tenantId,
      createdBranchId:ctx.branchId},select:{id:true,name:true},take:250,
      orderBy:[{name:"asc"},{id:"asc"}]}):Promise.resolve([]),
  ]);
  return <main className="module-page" dir={ar?"rtl":"ltr"}>
    <header className="module-header"><div>
      <Link className="back-link" href={"/"+locale+"/customers"}>{ar?"العملاء":"Customers"}</Link>
      <h1>{type==="FOLLOWUP"?(ar?"الإشعارات والمتابعة":"Notifications and follow-up"):
        (ar?"التسويق والحملات":"Marketing and campaigns")}</h1>
      <p className="module-sub">{type==="FOLLOWUP"?(ar?"نظّم مواعيد متابعة العملاء والطلبات.":"Manage customer and order follow-ups."):
        (ar?"جهّز حملاتك ورسائلك قبل اعتماد الإرسال.":"Prepare campaigns and review messages before sending.")}</p>
    </div></header>
    <EngagementPanel locale={locale} type={type} initial={records} customers={customers}/>
  </main>;
}
