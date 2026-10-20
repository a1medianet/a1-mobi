import { notFound } from "next/navigation";
import { OrderInbox } from "@/components/order-inbox";
export default async function OrdersPage({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;
 if(locale!=="ar"&&locale!=="en")notFound();
 return <OrderInbox locale={locale}/>;
}
