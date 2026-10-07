import { notFound } from "next/navigation";

export default async function SecurityPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;if(locale!=="ar"&&locale!=="en")notFound();const ar=locale==="ar";
  const cards=ar?[
    ["هوية وجلسات","كلمات مرور Argon2، جلسات خادم، إبطال جلسات، MFA وRecovery Codes."],
    ["عزل الجهات","Tenant/Branch context على الخادم مع RBAC وAudit للحركات الحساسة."],
    ["حماية الإساءة","Budgets لمحاولات الدخول والإجراءات الحساسة مع Same-Origin mutations."],
    ["اشتراكات Fail-Closed","الميزات والفروع تتحقق من Entitlements القادمة من A1 Billing Core."],
    ["الأسرار","Service tokens ومفاتيح التشفير في Environment فقط وليست في Git أو المتصفح."],
    ["الإصدارات","Version/build/channel وminimum supported version وحالة update داخل التطبيق."],
  ]:[
    ["Identity & sessions","Argon2 passwords, server sessions, revocation, MFA and recovery codes."],
    ["Tenant isolation","Server-side Tenant/Branch context with RBAC and audit evidence."],
    ["Abuse protection","Budgets for authentication and sensitive actions plus same-origin mutations."],
    ["Fail-closed subscription","Features and branches are verified against A1 Billing Core entitlements."],
    ["Secrets","Service tokens and encryption keys stay in environment configuration, never Git or browser code."],
    ["Version safety","Version/build/channel, minimum supported version and in-app update state."],
  ];
  return <main className="product-shell product-page"><section className="page-intro compact"><span className="product-eyebrow">TRUST & SECURITY</span><h1>{ar?"الحماية جزء من المنتج، لا إضافة لاحقة.":"Protection is part of the product, not an afterthought."}</h1><p>{ar?"هذه الصفحة تلخص ضوابط المنتج الحالية. Production/Public Release يبقى خاضعًا لـA1 Application Foundation evidence gate.":"This page summarizes current product controls. Production/Public Release remains subject to the A1 Application Foundation evidence gate."}</p></section><section className="trust-grid">{cards.map(([title,copy])=><article className="trust-card" key={title}><span className="product-eyebrow">CONTROL</span><h2>{title}</h2><p>{copy}</p></article>)}</section></main>;
}
