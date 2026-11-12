import { notFound } from "next/navigation";
import { StoreHome } from "@/components/store-home";

export const dynamic = "force-dynamic";

export default async function Dashboard({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;
  if(locale!=="ar"&&locale!=="en")notFound();
  return <StoreHome locale={locale}/>;
}
