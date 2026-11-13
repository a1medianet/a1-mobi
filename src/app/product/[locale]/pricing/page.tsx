import Link from "next/link";
import { notFound } from "next/navigation";

const copy={
  ar:{title:"خطط واضحة من التجربة إلى تعدد الفروع",sub:"جرّب إدارة البيع والمخزون والصيانة، ثم تواصل معنا لاختيار الخطة المناسبة لمتجرك ومعرفة تكلفتها.",trial:"التجربة",store:"متجر واحد",multi:"عدة فروع",free:"جرّب قبل الاشتراك",monthly:"تواصل لمعرفة السعر",custom:"حسب احتياجات متاجرك",start:"ابدأ التجربة",contact:"تواصل معنا",recommended:"الانطلاقة الموصى بها"},
  en:{title:"Clear plans from trial to multi-branch",sub:"Try sales, inventory and repair management, then contact us to discuss the right plan and pricing for your shop.",trial:"Trial",store:"Single store",multi:"Multiple branches",free:"Try before subscribing",monthly:"Ask about pricing",custom:"Tailored to your shops",start:"Start trial",contact:"Contact us",recommended:"Recommended starting point"}
} as const;

export default async function PricingPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;if(locale!=="ar"&&locale!=="en")notFound();const ar=locale==="ar";const t=copy[locale];
  const plans=[
    {name:t.trial,price:t.free,badge:t.recommended,features:ar?["فرع واحد","حتى 5 أعضاء","بيع ومخزون وصيانة","عملاء وديون وصندوق","تتبّع الأجهزة وأرقامها التسلسلية","تقارير وتعبئة","بيانات تجريبية جاهزة"]:["1 branch","Up to 5 members","POS + inventory + repairs","Customers, debt and cash","Device and serial number tracking","Reports and top-up","Ready sample data"],cta:t.start,href:"/product/"+locale+"/signup",primary:true},
    {name:t.store,price:t.monthly,features:ar?["كل ميزات التشغيل الأساسية","إدارة المستخدمين والصلاحيات","حفظ البيانات وسجل العمليات","مساعدة في اختيار الاشتراك","ناقش احتياجات الربط مع فريقنا"]:["All core operations","Users and role management","Data backup and operation history","Help choosing your subscription","Discuss integration needs with us"],cta:t.contact,href:"mailto:hi@a1medianet.com?subject="+encodeURIComponent("A1 Mobi — "+t.store)},
    {name:t.multi,price:t.custom,features:ar?["فروع متعددة","إدارة مركزية","سياسات حسب الفرع","تقارير مجمعة","توسع مؤسسي"]:["Multiple branches","Central administration","Branch policies","Consolidated reporting","Organization-scale rollout"],cta:t.contact,href:"mailto:hi@a1medianet.com?subject="+encodeURIComponent("A1 Mobi — "+t.multi)}
  ];
  return <main className="product-shell product-page">
    <section className="page-intro"><span className="product-eyebrow">{ar?"خطط تناسب متجرك":"Plans for your shop"}</span><h1>{t.title}</h1><p>{t.sub}</p></section>
    <section className="pricing-grid">{plans.map(plan=><article key={plan.name} className={"pricing-card "+(plan.primary?"featured":"")}>
      {plan.badge&&<span className="plan-badge">{plan.badge}</span>}<h2>{plan.name}</h2><strong>{plan.price}</strong>
      <ul>{plan.features.map(feature=><li key={feature}>✓ {feature}</li>)}</ul>
      <Link className={plan.primary?"product-cta":"product-secondary"} href={plan.href}>{plan.cta}</Link>
    </article>)}</section>
    <section className="pricing-note"><b>{ar?"معلومة مهمة":"Good to know"}</b><p>{ar?"يمكنك تجربة النظام قبل اختيار خطتك. ستعرف الخدمات المتاحة لكل متجر والفروع التي يمكنك إدارتها قبل الاشتراك.":"You can try the system before choosing a plan. Review what is included for each store or branch before subscribing."}</p></section>
  </main>;
}
