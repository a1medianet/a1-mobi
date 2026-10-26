import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderInbox } from "@/components/order-inbox";
export default async function OrdersPage({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;
 if(locale!=="ar"&&locale!=="en")notFound();
 if(process.env.A1_MOBI_PUBLIC_ORDERS_ENABLED!=="1")return <main className="module-page">
  <h1>{locale==="ar"?"طلبات زبائن المتجر":"Customer requests"}</h1>
  <p role="status">{locale==="ar"?"استقبال الطلبات عبر رابط المتجر غير مفعّل حاليًا. يمكنك متابعة البيع من نقطة البيع.":"Store-link requests are not enabled currently. You can continue selling through POS."}</p>
  <Link className="primary" href={"/"+locale+"/pos"}>{locale==="ar"?"فتح نقطة البيع":"Open POS"}</Link>
 </main>;
 return <OrderInbox locale={locale}/>;
}
