import { notFound } from "next/navigation";

export default async function TermsPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;if(locale!=="ar"&&locale!=="en")notFound();const ar=locale==="ar";
  return <main className="product-shell product-page policy-body">
    <section className="page-intro compact"><span className="product-eyebrow">PILOT TERMS</span><h1>{ar?"شروط تجربة A1 Mobi":"A1 Mobi Pilot Terms"}</h1><p>{ar?"ملخص شروط الاستخدام الحالية للـPilot. قبل الإطلاق التجاري العام تُراجع الصيغة القانونية النهائية بحسب السوق والعقد.":"Current Pilot-use terms summary. Final public commercial terms require market- and contract-specific legal review before launch."}</p></section>
    <section><h2>{ar?"نطاق التجربة":"Pilot scope"}</h2><p>{ar?"الـTrial مخصص لتقييم المنتج وتشغيل سيناريوهات متجر وصيانة في بيئة متفق عليها. البيانات التجريبية المعبأة ليست سجلات عميل إنتاجية.":"The Trial is for product evaluation and agreed store/repair scenarios. Populated demo records are not production customer records."}</p></section>
    <section><h2>{ar?"الحساب والوصول":"Account & access"}</h2><p>{ar?"الجهة مسؤولة عن حسابات أعضائها وصلاحياتهم وعدم مشاركة بيانات الدخول. العمليات الإدارية الحساسة تخضع للتدقيق والحماية.":"The organization is responsible for member accounts, permissions and credential hygiene. Sensitive administrative actions are protected and audited."}</p></section>
    <section><h2>{ar?"الاشتراك":"Subscription"}</h2><p>{ar?"مدة Trial والاستحقاقات تأتي من A1 Billing Core. استمرار الوصول بعد التجربة يعتمد على خطة تجارية مفعّلة أو اتفاق Pilot صالح.":"Trial duration and entitlements come from A1 Billing Core. Continued access after the Trial depends on an active commercial plan or valid Pilot agreement."}</p></section>
    <section><h2>{ar?"البيانات والخصوصية":"Data & privacy"}</h2><p>{ar?"استخدام البيانات يخضع لسياسة الخصوصية، وعزل الجهات، وسياسات السوق والعميل. لا تُعتبر هذه الصفحة بديلًا عن اتفاقية معالجة بيانات عند الحاجة.":"Data use is subject to the privacy policy, tenant isolation and applicable market/customer requirements. This page is not a substitute for a data-processing agreement where one is required."}</p></section>
    <section><h2>{ar?"الدعم":"Support"}</h2><p>hi@a1medianet.com</p></section>
  </main>;
}
