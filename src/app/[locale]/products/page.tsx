import { LiveCatalog } from "@/components/live-catalog";
import DemoProductsPage from "@/components/demo-products-page";
export default async function ProductsPage({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;
 return process.env.A1_MOBI_C_LIVE_01_ENABLED==="1"?<LiveCatalog locale={locale==="en"?"en":"ar"}/>:<DemoProductsPage/>;
}
