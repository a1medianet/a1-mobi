import Link from "next/link";
import { notFound } from "next/navigation";
import { currentStoreContext } from "@/server/auth-http";
import { db } from "@/server/db";
import { getMobiEntitlements } from "@/server/billing-client";

export const dynamic="force-dynamic";

export default async function AccountPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;if(locale!=="ar"&&locale!=="en")notFound();const ar=locale==="ar";
  const context=await currentStoreContext();
  if(!context)return <main className="module-page account-center"><section className="account-empty"><span className="module-kicker">A1 MOBI · ACCOUNT</span><h1>{ar?"سجّل الدخول لعرض حساب الجهة":"Sign in to view organization account"}</h1><p>{ar?"الحساب التجاري يعرض Tenant والفرع والأعضاء وحالة الاشتراك والأمان.":"The commercial account shows tenant, branch, members, subscription state and security."}</p><Link className="primary" href={"/"+locale+"/login"}>{ar?"تسجيل الدخول":"Sign in"}</Link></section></main>;

  const [tenant,branch,userCount]=await Promise.all([
    db.tenant.findUnique({where:{id:context.tenantId},select:{id:true,slug:true,name:true,defaultLocale:true,baseCurrency:true,billingTenantKey:true,a1AccountId:true,a1OrganizationId:true,_count:{select:{branches:true}}}}),
    db.branch.findUnique({where:{id:context.branchId},select:{id:true,code:true,name:true}}),
    db.user.count({where:{tenantId:context.tenantId,isActive:true}}),
  ]);
  if(!tenant||!branch)return <main className="module-page"><div className="module-banner">Account context unavailable.</div></main>;

  let billing:{status:string;planCode?:string;expiresAt?:string;features:Record<string,string>}|null=null;
  let billingError="";
  if(tenant.billingTenantKey){
    try{billing=await getMobiEntitlements(tenant.billingTenantKey)}
    catch(error){billingError=error instanceof Error?error.message:"A1_BILLING_UNAVAILABLE"}
  }

  const enabled=Object.entries(billing?.features||{}).filter(([,value])=>value==="true");
  const limits=Object.entries(billing?.features||{}).filter(([,value])=>value!=="true"&&value!=="false");
  const portal=process.env.A1_BILLING_PORTAL_URL;

  return <main className="module-page account-center">
    <header className="module-header"><div><Link href={"/"+locale} className="back-link">{ar?"لوحة التحكم":"Dashboard"}</Link><p className="module-kicker">A1 MOBI · ACCOUNT CENTER</p><h1>{tenant.name}</h1><p className="module-sub">{ar?"إدارة الجهة والفرع والاشتراك والوصول.":"Organization, branch, subscription and access overview."}</p></div>{portal?<Link className="soft-btn" href={portal}>{ar?"إدارة الفوترة":"Billing portal"}</Link>:null}</header>

    <section className="account-hierarchy">
      <article><small>A1 Account</small><strong>{tenant.a1AccountId|| (ar?"محلي حاليًا":"Local identity")}</strong></article>
      <span>→</span><article><small>{ar?"الجهة":"Organization"}</small><strong>{tenant.a1OrganizationId||tenant.name}</strong></article>
      <span>→</span><article><small>Tenant</small><strong>{tenant.slug}</strong></article>
      <span>→</span><article><small>{ar?"الفرع":"Branch"}</small><strong>{branch.name} · {branch.code}</strong></article>
    </section>

    <section className="account-grid">
      <article className="account-card"><span className="module-kicker">ORGANIZATION</span><h2>{ar?"بنية الحساب":"Account structure"}</h2><div className="account-facts"><div><small>{ar?"الفروع":"Branches"}</small><strong>{tenant._count.branches}</strong></div><div><small>{ar?"الأعضاء النشطون":"Active members"}</small><strong>{userCount}</strong></div><div><small>{ar?"العملة":"Currency"}</small><strong>{tenant.baseCurrency}</strong></div><div><small>{ar?"اللغة":"Locale"}</small><strong>{tenant.defaultLocale.toUpperCase()}</strong></div></div><div className="account-links"><Link href={"/"+locale+"/settings/team"}>{ar?"الفريق والصلاحيات":"Team & access"}</Link><Link href={"/"+locale+"/settings/security"}>{ar?"أمان الحساب":"Account security"}</Link></div></article>

      <article className="account-card"><span className="module-kicker">SUBSCRIPTION</span><h2>{ar?"الخطة والصلاحيات":"Plan & entitlements"}</h2>{billing?<><div className="subscription-status"><span className={"pill "+(billing.status==="active"||billing.status==="trialing"?"done":"pending")}>{billing.status.toUpperCase()}</span><strong>{billing.planCode||"—"}</strong></div>{billing.expiresAt?<p>{ar?"الاستحقاق الحالي حتى":"Current access through"} <bdi dir="ltr">{new Date(billing.expiresAt).toLocaleString()}</bdi></p>:null}<div className="entitlement-list">{enabled.map(([feature])=><span key={feature}>✓ {feature.replace(".enabled","")}</span>)}{limits.map(([feature,value])=><span key={feature}>{feature}: {value}</span>)}</div></>:<div className="module-banner"><strong>{ar?"تعذر قراءة Billing Core":"Billing Core unavailable"}</strong><p>{billingError|| (ar?"لم يتم ربط Billing Tenant بعد.":"Billing tenant is not bound yet.")}</p></div>}</article>
    </section>
  </main>;
}
