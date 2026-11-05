import { notFound } from "next/navigation";
import LiveOperationsPage from "@/components/live-operations";
export const dynamic = "force-dynamic";
export default function Page() {
  if (process.env.A1_MOBI_C_LIVE_01_ENABLED !== "1") notFound();
  return <LiveOperationsPage />;
}
