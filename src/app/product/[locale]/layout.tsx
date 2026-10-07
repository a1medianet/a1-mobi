import { notFound } from "next/navigation";
import { ProductSiteShell } from "@/components/product-site-shell";

export default async function ProductLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){
  const {locale}=await params;
  if(locale!=="ar"&&locale!=="en") notFound();
  return <ProductSiteShell locale={locale}>{children}</ProductSiteShell>;
}
