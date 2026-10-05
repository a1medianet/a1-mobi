import Link from "next/link";
import { notFound } from "next/navigation";

const copy={
  ar:{
    back:"الإدارة",title:"أمان الحساب",sub:"حالة الحماية في نسخة Pilot Demo",
    notice:"هذه صفحة مراجعة بصرية فقط. إعداد MFA والاستعادة الفعلي موجود في مسار Foundation Account Security المنفصل ولم يُدمج في هذه النسخة بعد.",
    session:"الجلسات",sessionText:"جلسات قاعدة البيانات والإبطال موجودة في Foundation الملتزم.",
    mfa:"MFA / TOTP",mfaText:"قيد HARDENING وإعادة التحقق بعد مراجعات Claude وGemini.",
    recovery:"استعادة الحساب",recoveryText:"قيد HARDENING مع حماية الرموز والإبطال وحدود المحاولات.",
    abuse:"حماية الإساءة",abuseText:"Account + Tenant + Global budgets اجتازت بوابة Abuse Controls.",
    release:"حالة الإصدار",releaseText:"Production/Public Release محظور حتى PASS لجميع بوابات Foundation وA1 Application Foundation.",
    pass:"PASS",hardening:"HARDENING",blocked:"BLOCKED",team:"الفريق والصلاحيات",login:"صفحة الدخول",
  },
  en:{
    back:"Admin",title:"Account security",sub:"Protection status in the Pilot Demo build",
    notice:"Visual review page only. Live MFA and recovery work exists on the separate Foundation Account Security path and is not merged into this demo build yet.",
    session:"Sessions",sessionText:"Database sessions and revocation are implemented in the committed Foundation.",
    mfa:"MFA / TOTP",mfaText:"HARDENING and re-verification after Claude and Gemini reviews.",
    recovery:"Account recovery",recoveryText:"HARDENING with token protection, revocation and attempt budgets.",
    abuse:"Abuse protection",abuseText:"Account + Tenant + Global budgets passed the Abuse Controls gate.",
    release:"Release status",releaseText:"Production/Public Release is blocked until all Foundation and A1 Application Foundation gates PASS.",
    pass:"PASS",hardening:"HARDENING",blocked:"BLOCKED",team:"Team & access",login:"Login",
  }
} as const;

export default async function SecurityPage({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;
  if(locale!=="ar"&&locale!=="en") notFound();
  const t=copy[locale];
  const rows=[
    [t.session,t.sessionText,t.pass,"done"],
    [t.abuse,t.abuseText,t.pass,"done"],
    [t.mfa,t.mfaText,t.hardening,"pending"],
    [t.recovery,t.recoveryText,t.hardening,"pending"],
    [t.release,t.releaseText,t.blocked,"pending"],
  ] as const;
  return <main className="module-page">
    <header className="module-header"><div>
      <Link href={"/"+locale+"/admin"} className="back-link">{t.back}</Link>
      <p className="module-kicker">A1 MOBI · SECURITY</p>
      <h1>{t.title}</h1><p className="module-sub">{t.sub}</p>
    </div><div className="module-actions">
      <Link className="soft-btn" href={"/"+locale+"/settings/team"}>{t.team}</Link>
      <Link className="soft-btn" href={"/"+locale+"/login"}>{t.login}</Link>
    </div></header>
    <p className="preview-notice" role="status">{t.notice}</p>
    <section className="security-status-grid">
      {rows.map(([title,description,status,tone])=><article key={title}>
        <div><h2>{title}</h2><p>{description}</p></div>
        <span className={"pill "+tone}>{status}</span>
      </article>)}
    </section>
  </main>;
}
