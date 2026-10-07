"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type Result={tenant:string;loginPath:string;trial:{status:string;planCode:string;expiresAt?:string;features:Record<string,string>}};

function slugify(value:string){
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60);
}

export function TrialSignup({locale}:{locale:"ar"|"en"}){
  const ar=locale==="ar";
  const [step,setStep]=useState(1);
  const [store,setStore]=useState("");
  const [slug,setSlug]=useState("");
  const [branch,setBranch]=useState("");
  const [branchCode,setBranchCode]=useState("MAIN");
  const [ownerName,setOwnerName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [result,setResult]=useState<Result|null>(null);

  const effectiveSlug=useMemo(()=>slug||slugify(store),[slug,store]);
  const canNext=step===1?(store.trim().length>=2&&effectiveSlug.length>=3):
    step===2?(branch.trim().length>=2&&branchCode.trim().length>=1):
    step===3?(ownerName.trim().length>=2&&email.includes("@")&&password.length>=12):true;

  async function submit(event:FormEvent){
    event.preventDefault();
    if(step<4){setStep(step+1);return}
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/onboarding/trial",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          tenantSlug:effectiveSlug,
          tenantName:store,
          branchCode,
          branchName:branch,
          ownerEmail:email,
          ownerDisplayName:ownerName,
          ownerPassword:password,
          locale,
        }),
      });
      const body=await response.json();
      if(!response.ok) throw new Error(body.error||"Unable to start trial");
      setResult(body);
    }catch(error){
      setError(error instanceof Error?error.message:"Unable to start trial");
    }finally{setBusy(false)}
  }

  if(result)return <section className="signup-success">
    <span className="success-mark">✓</span>
    <span className="product-eyebrow">TRIAL READY</span>
    <h1>{ar?"متجرك جاهز للتسجيل والدخول.":"Your store is ready to sign in."}</h1>
    <p>{ar?"تم إنشاء الجهة والفرع والمالك وتفعيل صلاحيات التجربة عبر A1 Billing Core.":"Organization, branch and owner were created and trial entitlements were activated through A1 Billing Core."}</p>
    <div className="success-facts">
      <div><small>{ar?"المتجر":"Store"}</small><strong>{result.tenant}</strong></div>
      <div><small>{ar?"الخطة":"Plan"}</small><strong>{result.trial.planCode}</strong></div>
      <div><small>{ar?"الحالة":"Status"}</small><strong>{result.trial.status}</strong></div>
      <div><small>{ar?"تنتهي":"Expires"}</small><strong>{result.trial.expiresAt?new Date(result.trial.expiresAt).toLocaleDateString():"—"}</strong></div>
    </div>
    <div className="product-actions"><Link className="product-cta" href={result.loginPath}>{ar?"تسجيل الدخول إلى المتجر":"Sign in to store"}</Link><Link className="product-secondary" href={"/product/"+locale+"/demo"}>{ar?"فتح تجربة البيانات":"Open populated demo"}</Link></div>
  </section>;

  const labels=ar?["الجهة","الفرع","المالك","المراجعة"]:["Organization","Branch","Owner","Review"];
  return <form className="trial-signup" onSubmit={submit}>
    <div className="signup-steps">{labels.map((label,index)=><button type="button" key={label} className={step===index+1?"active":step>index+1?"done":""} onClick={()=>index+1<step&&setStep(index+1)}><span>{step>index+1?"✓":index+1}</span>{label}</button>)}</div>

    {step===1&&<section className="signup-panel">
      <span className="product-eyebrow">1 · ORGANIZATION</span><h2>{ar?"أنشئ جهة المتجر":"Create store organization"}</h2><p>{ar?"هذه هي الجهة التجارية التي ستحتوي الفروع والأعضاء وصلاحيات الاشتراك.":"This is the commercial organization that owns branches, members and subscription entitlements."}</p>
      <label>{ar?"اسم المتجر / الجهة":"Store / organization name"}<input value={store} onChange={e=>{setStore(e.target.value);if(!slug)setSlug(slugify(e.target.value))}} placeholder={ar?"مثال: Mobi Line":"e.g. Mobi Line"} required/></label>
      <label>{ar?"معرّف المتجر":"Store identifier"}<input value={effectiveSlug} onChange={e=>setSlug(slugify(e.target.value))} dir="ltr" placeholder="mobi-line" required/></label>
    </section>}

    {step===2&&<section className="signup-panel">
      <span className="product-eyebrow">2 · BRANCH</span><h2>{ar?"أضف أول فرع":"Add first branch"}</h2><p>{ar?"يمكن للجهة امتلاك عدة فروع لاحقًا حسب الخطة.":"The organization can add more branches later according to its plan."}</p>
      <label>{ar?"اسم الفرع":"Branch name"}<input value={branch} onChange={e=>setBranch(e.target.value)} placeholder={ar?"طرابلس - الفرع الرئيسي":"Tripoli - Main branch"} required/></label>
      <label>{ar?"كود الفرع":"Branch code"}<input value={branchCode} onChange={e=>setBranchCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,""))} dir="ltr" required/></label>
    </section>}

    {step===3&&<section className="signup-panel">
      <span className="product-eyebrow">3 · OWNER</span><h2>{ar?"حساب مالك المتجر":"Store owner account"}</h2><p>{ar?"هذا المستخدم يحصل على Owner role داخل Tenant الجديد. فعّل MFA بعد أول دخول.":"This user receives the Owner role inside the new tenant. Enable MFA after first sign-in."}</p>
      <label>{ar?"اسم المالك":"Owner name"}<input value={ownerName} onChange={e=>setOwnerName(e.target.value)} autoComplete="name" required/></label>
      <label>{ar?"البريد":"Email"}<input value={email} onChange={e=>setEmail(e.target.value)} type="email" dir="ltr" autoComplete="email" required/></label>
      <label>{ar?"كلمة المرور":"Password"}<input value={password} onChange={e=>setPassword(e.target.value)} type="password" minLength={12} autoComplete="new-password" required/><small>{ar?"12 محرفًا على الأقل. لا تستخدم كلمة مرور مهمة في تجربة عامة.":"At least 12 characters. Do not reuse an important password in a public trial."}</small></label>
    </section>}

    {step===4&&<section className="signup-panel review-panel">
      <span className="product-eyebrow">4 · REVIEW</span><h2>{ar?"راجع ثم ابدأ 7 أيام":"Review and start seven days"}</h2>
      <div className="review-grid">
        <div><small>{ar?"الجهة":"Organization"}</small><strong>{store}</strong></div>
        <div><small>Tenant</small><strong dir="ltr">{effectiveSlug}</strong></div>
        <div><small>{ar?"الفرع":"Branch"}</small><strong>{branch}</strong></div>
        <div><small>{ar?"الكود":"Code"}</small><strong dir="ltr">{branchCode}</strong></div>
        <div><small>{ar?"المالك":"Owner"}</small><strong>{ownerName}</strong></div>
        <div><small>{ar?"البريد":"Email"}</small><strong dir="ltr">{email}</strong></div>
      </div>
      <div className="trial-entitlements"><b>{ar?"يشمل الـPilot":"Pilot includes"}</b><span>POS</span><span>Inventory</span><span>Repairs</span><span>Customers</span><span>Cash</span><span>Top-up</span><span>Reports</span><span>Device Trust</span><span>5 Staff</span><span>1 Branch</span></div>
    </section>}

    {error&&<div className="signup-error" role="alert">{error==="TRIAL_ONBOARDING_DISABLED"?(ar?"التسجيل العام للتجربة غير مفعّل على هذه البيئة. استخدم المتجر التجريبي أو تواصل معنا.":"Public trial signup is not enabled in this environment. Use the populated demo or contact us."):error}</div>}

    <div className="signup-actions">
      {step>1&&<button type="button" className="product-secondary" onClick={()=>setStep(step-1)}>{ar?"السابق":"Back"}</button>}
      <button className="product-cta" disabled={!canNext||busy}>{busy?(ar?"جارٍ الإنشاء…":"Creating…"):step===4?(ar?"ابدأ التجربة":"Start trial"):(ar?"التالي":"Continue")}</button>
    </div>
  </form>;
}
