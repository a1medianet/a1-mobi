import { notFound } from "next/navigation";
import { CustomerOrderForm } from "@/components/customer-order-form";
import { publicStoreCatalog } from "@/server/public-store";
export const dynamic="force-dynamic";
export default async function StorePage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const store=await publicStoreCatalog(slug);
 if(!store)notFound();
 return <CustomerOrderForm slug={slug} branchName={store.name} products={store.products}/>;
}
