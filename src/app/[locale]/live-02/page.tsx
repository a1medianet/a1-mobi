import { notFound } from "next/navigation";
import RepairLivePage from "@/components/repair-live-operations";
export const dynamic="force-dynamic";
export default function Page(){if(process.env.A1_MOBI_C_LIVE_02_ENABLED!=="1")notFound();return <RepairLivePage/>;}
