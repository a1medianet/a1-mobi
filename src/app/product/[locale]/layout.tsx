import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductSiteShell } from "@/components/product-site-shell";

export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{
  const {locale}=await params;
  if(locale!=="ar"&&locale!=="en") return {};
  const ar=locale==="ar";
  const title=ar?"A1 Mobi | نظام تشغيل متاجر وصيانة الموبايل":"A1 Mobi | Mobile Retail & Repair OS";
  const description=ar
    ?"نقطة بيع ومخزون وصيانة وIMEI وعملاء وصندوق وتقارير وفريق ضمن منصة واحدة متعددة الجهات والفروع."
    :"POS, inventory, repairs, IMEI, customers, cash, reports and team operations in one multi-tenant, branch-ready platform.";
  return {
    title,
    description,
    applicationName:"A1 Mobi",
    robots:{index:true,follow:true},
    alternates:{languages:{ar:"/product/ar",en:"/product/en"}},
    openGraph:{title,description,type:"website",locale:ar?"ar_LB":"en_US",siteName:"A1 Mobi"},
    twitter:{card:"summary_large_image",title,description},
  };
}

export default async function ProductLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){
  const {locale}=await params;
  if(locale!=="ar"&&locale!=="en") notFound();
  return <ProductSiteShell locale={locale}>{children}</ProductSiteShell>;
}
