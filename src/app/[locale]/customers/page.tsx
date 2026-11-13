import { notFound } from "next/navigation";
import CustomerOwnerDirectory from "@/components/customer-owner-directory";
export const dynamic = "force-dynamic";
export default async function CustomersPage({params}:{params:Promise<{locale:string}>}) {
 const {locale}=await params;
 if(locale!=="ar"&&locale!=="en")notFound();
 return <CustomerOwnerDirectory locale={locale}/>;
}
