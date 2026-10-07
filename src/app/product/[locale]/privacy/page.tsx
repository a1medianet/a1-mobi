import { notFound } from "next/navigation";

export default async function PrivacyPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;if(locale!=="ar"&&locale!=="en")notFound();const ar=locale==="ar";
  return <main className="product-shell product-page policy-body"><section className="page-intro compact"><span className="product-eyebrow">PRIVACY</span><h1>{ar?"خصوصية A1 Mobi":"A1 Mobi Privacy"}</h1><p>{ar?"ملخص منتج يشرح فئات البيانات ومبادئ الجمع والوصول والاحتفاظ قبل الإطلاق العام.":"Product privacy summary describing data categories, collection, access and retention principles before public launch."}</p></section>
    <section><h2>{ar?"البيانات التشغيلية":"Operational data"}</h2><p>{ar?"قد يتعامل النظام مع بيانات المتجر والعملاء والأجهزة وIMEI/Serial وأوامر الصيانة والمبيعات والمدفوعات وسجلات التدقيق بحسب الوحدات المفعّلة.":"The system may process store, customer, device, IMEI/Serial, repair, sales, payment and audit data according to enabled modules."}</p></section>
    <section><h2>{ar?"الفصل بين الجهات":"Tenant separation"}</h2><p>{ar?"يجب ربط كل طلب تشغيلي بسياق Tenant/Branch موثق من الجلسة على الخادم، وليس من مدخلات المتصفح وحدها.":"Operational requests must be bound to server-authenticated Tenant/Branch context, not browser input alone."}</p></section>
    <section><h2>{ar?"القياس والتحليلات":"Telemetry"}</h2><p>{ar?"لا تُفعّل Telemetry شخصية افتراضيًا. Pulse يستخدم أقل قدر لازم من بيانات التشغيل، ومعرّفات pseudonymous عند الحاجة، ولا ينبغي إرسال كلمات مرور أو Tokens أو Cookies أو محتوى عميل حساس.":"Personal telemetry is not enabled by default. Pulse uses the minimum operational data required, pseudonymous identifiers where applicable, and must not transmit passwords, tokens, cookies or sensitive customer content."}</p></section>
    <section><h2>{ar?"الاحتفاظ والحذف":"Retention & deletion"}</h2><p>{ar?"سياسات الاحتفاظ النهائية تعتمد على السوق والعميل والتزامات النسخ الاحتياطي والقانون قبل Production. يجب أن تكون عمليات الحذف والتصدير إدارية ومدققة.":"Final retention depends on market, customer, backup and legal obligations before Production. Export and deletion actions must be administrative and auditable."}</p></section>
    <section><h2>{ar?"التواصل":"Contact"}</h2><p>hi@a1medianet.com</p></section>
  </main>;
}
