import { notFound } from "next/navigation";
import { TrialSignup } from "@/components/trial-signup";

export default async function SignupPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;if(locale!=="ar"&&locale!=="en")notFound();
  const ar=locale==="ar";
  return <main className="product-shell product-page signup-page">
    <section className="page-intro compact"><span className="product-eyebrow">7-DAY PILOT</span><h1>{ar?"من جهة جديدة إلى متجر عامل خلال دقائق.":"From a new organization to a working store in minutes."}</h1><p>{ar?"ننشئ Tenant معزولًا، أول فرع، Owner role، ثم نطلب صلاحيات التجربة من A1 Billing Core.":"We provision an isolated tenant, first branch and Owner role, then request trial entitlements from A1 Billing Core."}</p></section>
    <div className="signup-layout"><TrialSignup locale={locale}/><aside className="signup-side"><span className="product-eyebrow">WHAT YOU GET</span><h2>{ar?"ليست تجربة فارغة.":"Not an empty trial."}</h2><p>{ar?"بعد إنشاء الحساب يمكنك مقارنة متجرك الجديد مع المساحة التجريبية الممتلئة بمنتجات ومخزون وصيانة وعملاء.":"After account creation, compare your new store with the populated demo containing products, stock, repairs and customers."}</p><ul><li>12 {ar?"منتجًا نموذجيًا":"sample products"}</li><li>POS {ar?"تفاعلي":"interactive"}</li><li>{ar?"رحلات صيانة ومخزون":"Repair and inventory journeys"}</li><li>MFA + Recovery</li><li>RBAC + Audit</li><li>AR / EN + RTL / LTR</li></ul></aside></div>
  </main>;
}
