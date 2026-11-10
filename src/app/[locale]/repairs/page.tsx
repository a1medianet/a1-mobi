import { notFound } from "next/navigation";
import RepairLivePage from "@/components/repair-live-operations";
export const dynamic = "force-dynamic";
export default async function RepairsPage({params}:{params:Promise<{locale:string}>}) {
 const {locale}=await params;
 if(locale!=="ar"&&locale!=="en")notFound();
 return <RepairLivePage backToDashboard />;
}
