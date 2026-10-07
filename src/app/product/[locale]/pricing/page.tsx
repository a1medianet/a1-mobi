import Link from "next/link";
import { notFound } from "next/navigation";

const copy={
  ar:{title:"خطط واضحة من التجربة إلى تعدد الفروع",sub:"ابدأ بتجربة كاملة لمدة 7 أيام. الفوترة والاشتراكات تُدار مركزيًا عبر A1 Billing Core، لذلك لا يحتاج المتجر إلى إعداد بوابة دفع داخل Mobi.",trial:"Pilot Trial",store:"Store",multi:"Multi-Branch",free:"7 أيام مجانًا",monthly:"شهري / سنوي",custom:"حسب احتياج الجهة",start:"ابدأ التجربة",contact:"تواصل معنا",recommended:"الانطلاقة الموصى بها"},
  en:{title:"Clear plans from trial to multi-branch",sub:"Start with a complete seven-day trial. Billing and subscription lifecycle are centralized in A1 Billing Core, so stores do not configure a SaaS payment gateway inside Mobi.",trial:"Pilot Trial",store:"Store",multi:"Multi-Branch",free:"7 days free",monthly:"Monthly / annual",custom:"Organization-based",start:"Start trial",contact:"Contact us",recommended:"Recommended starting point"}
} as const;

export default async function PricingPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;if(locale!=="ar"&&locale!=="en")notFound();const ar=locale==="ar";const t=copy[locale];
  const plans=[
    {name:t.trial,price:t.free,badge:t.recommended,features:ar?["فرع واحد","حتى 5 أعضاء","POS + مخزون + صيانة","عملاء وديون وصندوق","IMEI / Device Trust","تقارير وتعبئة","بيانات تجريبية جاهزة"]:["1 branch","Up to 5 members","POS + inventory + repairs","Customers, debt and cash","IMEI / Device Trust","Reports and top-up","Ready sample data"],cta:t.start,href:"/product/"+locale+"/signup",primary:true},
    {name:t.store,price:t.monthly,features:ar?["كل ميزات التشغيل الأساسية","إدارة المستخدمين والصلاحيات","نسخ احتياطي وEvidence","دعم خطط الاشتراك","جاهز لربط التكاملات"]:["All core operations","Users and role management","Backup and evidence controls","Subscription plan support","Integration-ready"],cta:t.contact,href:"mailto:hi@a1medianet.com"},
    {name:t.multi,price:t.custom,features:ar?["فروع متعددة","إدارة مركزية","سياسات حسب الفرع","تقارير مجمعة","توسع مؤسسي"]:["Multiple branches","Central administration","Branch policies","Consolidated reporting","Organization-scale rollout"],cta:t.contact,href:"mailto:hi@a1medianet.com"}
  ];
  return <main className="product-shell product-page">
    <section className="page-intro"><span className="product-eyebrow">PLANS & ENTITLEMENTS</span><h1>{t.title}</h1><p>{t.sub}</p></section>
    <section className="pricing-grid">{plans.map(plan=><article key={plan.name} className={"pricing-card "+(plan.primary?"featured":"")}>
      {plan.badge&&<span className="plan-badge">{plan.badge}</span>}<h2>{plan.name}</h2><strong>{plan.price}</strong>
      <ul>{plan.features.map(feature=><li key={feature}>✓ {feature}</li>)}</ul>
      <Link className={plan.primary?"product-cta":"product-secondary"} href={plan.href}>{plan.cta}</Link>
    </article>)}</section>
    <section className="pricing-note"><b>{ar?"مهم":"Important"}</b><p>{ar?"Mobi لا يكرر منطق الاشتراكات داخله. صلاحيات الخطة والفترة التجريبية وحالة الاشتراك تأتي من A1 Billing Core وتُطبّق على Tenant المتجر.":"Mobi does not duplicate subscription logic. Plan entitlements, trial lifetime and subscription state are delivered by A1 Billing Core and applied to the store tenant."}</p></section>
  </main>;
}
