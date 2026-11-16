import { notFound, redirect } from "next/navigation";
import { currentStoreContext } from "@/server/auth-http";
import { mobiSupportGate } from "@/core/support-gate";
import { SupportCenterClient } from "./support-center-client";

// Both gates are required; no customer traffic until the Support host API
// is independently accepted. A flag alone cannot expose an unfinished flow.
export const dynamic="force-dynamic";
export default async function SupportPage({params}:{params:Promise<{locale:string}>}) {
 const {locale}=await params;
 if(locale!=="ar"&&locale!=="en")notFound();
 if(!mobiSupportGate(process.env))notFound();
 const session=await currentStoreContext();
 if(!session)redirect("/"+locale+"/login?next=%2F"+locale+"%2Fsupport");
 return <main dir={locale==="ar"?"rtl":"ltr"} className="content">
   <SupportCenterClient />
 </main>;
}
