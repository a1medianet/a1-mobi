import { notFound } from "next/navigation";
import { TrialSignup } from "@/components/trial-signup";

export default async function SignupPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;if(locale!=="ar"&&locale!=="en")notFound();
  const ar=locale==="ar";
  return <main className="product-shell product-page signup-page">
    <section className="page-intro compact"><span className="product-eyebrow">{ar?"ابدأ متجرك":"CREATE YOUR STORE"}</span><h1>{ar?"من جهة جديدة إلى متجر عامل خلال دقائق.":"From a new organization to a working store in minutes."}</h1><p>{ar?"أنشئ حساب متجرك وحدد الفرع الأول والمستخدم المسؤول، ثم ابدأ في إعداد أعمالك.":"Create your store account, set up your first branch and choose the person responsible for managing it."}</p></section>
    <div className="signup-layout"><TrialSignup locale={locale}/><aside className="signup-side"><span className="product-eyebrow">{ar?"ماذا ستحصل عليه؟":"WHAT YOU GET"}</span><h2>{ar?"ليست تجربة فارغة.":"Not an empty trial."}</h2><p>{ar?"بعد إنشاء الحساب يمكنك مقارنة متجرك الجديد مع المساحة التجريبية الممتلئة بمنتجات ومخزون وصيانة وعملاء.":"After account creation, compare your new store with the populated demo containing products, stock, repairs and customers."}</p><ul>
      <li>{ar?"منتجات وأجهزة تجريبية للتعرّف إلى النظام":"Sample products and devices to explore"}</li>
      <li>{ar?"تجربة البيع والفواتير والمخزون":"Try sales, invoices and inventory"}</li>
      <li>{ar?"متابعة عمليات الصيانة والعملاء":"Follow repair jobs and customers"}</li>
      <li>{ar?"إدارة الموظفين وصلاحياتهم":"Manage staff and their access"}</li>
      <li>{ar?"استخدام النظام بالعربية أو الإنكليزية":"Use the system in Arabic or English"}</li>
    </ul></aside></div>
  </main>;
}
