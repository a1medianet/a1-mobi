import { notFound } from "next/navigation";
import LiveOperationsPage from "@/components/live-operations";
import DemoPosPage from "@/components/demo-pos";

export const dynamic = "force-dynamic";

export default async function PosPage({params}:{params:Promise<{locale:string}>}) {
 const {locale}=await params;
 if(locale!=="ar"&&locale!=="en") notFound();
 // Reuse the existing tenant-scoped operations API only when explicitly enabled.
 // Production with the gate OFF retains the clearly labelled demonstration POS.
 return process.env.A1_MOBI_C_LIVE_01_ENABLED==="1"
  ? <LiveOperationsPage mode="pos" />
  : <DemoPosPage />;
}
