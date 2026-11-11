import { LiveCatalog } from "@/components/live-catalog";
export default async function ManageProductsPage({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;
 return <LiveCatalog locale={locale==="en"?"en":"ar"}/>;
}
