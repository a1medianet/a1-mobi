"use client";
import { formatDate } from "@/core/config/number-format";
import { billingStatusLabel, planLabel } from "@/core/config/display-labels";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AuthTurnstile } from "@/components/auth-turnstile";

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
  const [username,setUsername]=useState("");
  const [recoveryEmail,setRecoveryEmail]=useState("");
  const [available,setAvailable]=useState<boolean|null>(null);
  const email=username ? `${username.toLowerCase()}@a1mobi.app` : "";
  const [password,setPassword]=useState("");
  const [turnstileToken,setTurnstileToken]=useState("");
  const [challengeVersion,setChallengeVersion]=useState(0);
  const onTurnstileToken=useCallback((token:string)=>setTurnstileToken(token),[]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [result,setResult]=useState<Result|null>(null);

  const effectiveSlug=useMemo(()=>slug||slugify(store),[slug,store]);
  useEffect(()=>{
    if(!/^[a-z][a-z0-9_]{2,29}$/.test(username)) return;
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      try {
        const response=await fetch(`/api/onboarding/username?username=${encodeURIComponent(username)}`,{signal:controller.signal,cache:"no-store"});
        const body=await response.json();
        if(!controller.signal.aborted) setAvailable(response.ok && body.available===true);
      } catch {if(!controller.signal.aborted) setAvailable(false);}
    },350);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[username]);
  const canNext=step===1?(store.trim().length>=2&&effectiveSlug.length>=3):
    step===2?(branch.trim().length>=2&&branchCode.trim().length>=1):
    step===3?(ownerName.trim().length>=2&&available===true&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)&&password.length>=12):true;

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
          username,
          recoveryEmail,
          ownerDisplayName:ownerName,
          ownerPassword:password,
          ...(turnstileToken?{turnstileToken}:{}),
          locale,
        }),
      });
      const body=await response.json();
      if(!response.ok) throw new Error(body.error||"Unable to start trial");
      setResult(body);
    }catch(error){
      setError(error instanceof Error?error.message:"Unable to start trial");
    }finally{setBusy(false);setTurnstileToken("");setChallengeVersion(v=>v+1)}
  }

  if(result)return <section className="signup-success">
    <span className="success-mark">✓</span>
    <span className="product-eyebrow">TRIAL READY</span>
    <h1>{ar?"متجرك جاهز للتسجيل والدخول.":"Your store is ready to sign in."}</h1>
    <p>{ar?"تم إنشاء الجهة والفرع والمالك وتفعيل صلاحيات التجربة عبر A1 Billing Core.":"Organization, branch and owner were created and trial entitlements were activated through A1 Billing Core."}</p>
    <div className="success-facts">
      <div><small>{ar?"المتجر":"Store"}</small><strong>{result.tenant}</strong></div>
      <div><small>{ar?"الخطة":"Plan"}</small><strong>{planLabel(result.trial.planCode,locale)}</strong></div>
      <div><small>{ar?"الحالة":"Status"}</small><strong>{billingStatusLabel(result.trial.status,locale)}</strong></div>
      <div><small>{ar?"تنتهي":"Expires"}</small><strong>{result.trial.expiresAt?formatDate(result.trial.expiresAt,ar?"ar":"en"):"—"}</strong></div>
    </div>
    <div className="product-actions"><Link className="product-cta" href={result.loginPath}>{ar?"تسجيل الدخول إلى المتجر":"Sign in to store"}</Link><Link className="product-secondary" href={"/product/"+locale+"/demo"}>{ar?"فتح تجربة البيانات":"Open populated demo"}</Link></div>
  </section>;

  const labels=ar?["الجهة","الفرع","المالك","المراجعة"]:["Organization","Branch","Owner","Review"];
  return <form className="trial-signup" onSubmit={submit}>
    <div className="signup-steps">{labels.map((label,index)=><button type="button" key={label} className={step===index+1?"active":step>index+1?"done":""} onClick={()=>index+1<step&&setStep(index+1)}><span>{step>index+1?"✓":index+1}</span>{label}</button>)}</div>

    {step===1&&<section className="signup-panel">
      <span className="product-eyebrow">{ar?"الخطوة 1 · المتجر":"STEP 1 · STORE"}</span><h2>{ar?"أنشئ جهة المتجر":"Create store organization"}</h2><p>{ar?"هذه هي الجهة التجارية التي ستحتوي الفروع والأعضاء وصلاحيات الاشتراك.":"This is the commercial organization that owns branches, members and subscription entitlements."}</p>
      <label>{ar?"اسم المتجر / الجهة":"Store / organization name"}<input value={store} onChange={e=>{setStore(e.target.value);if(!slug)setSlug(slugify(e.target.value))}} placeholder={ar?"مثال: A1 Mobi":"e.g. A1 Mobi"} required/></label>
      <label>{ar?"معرّف المتجر":"Store identifier"}<input value={effectiveSlug} onChange={e=>setSlug(slugify(e.target.value))} dir="ltr" lang="en" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="a1-mobi" required/></label>
    </section>}

    {step===2&&<section className="signup-panel">
      <span className="product-eyebrow">{ar?"الخطوة 2 · الفرع":"STEP 2 · BRANCH"}</span><h2>{ar?"أضف أول فرع":"Add first branch"}</h2><p>{ar?"يمكن للجهة امتلاك عدة فروع لاحقًا حسب الخطة.":"The organization can add more branches later according to its plan."}</p>
      <label>{ar?"اسم الفرع":"Branch name"}<input value={branch} onChange={e=>setBranch(e.target.value)} placeholder={ar?"طرابلس - الفرع الرئيسي":"Tripoli - Main branch"} required/></label>
      <label>{ar?"كود الفرع":"Branch code"}<input value={branchCode} onChange={e=>setBranchCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,""))} dir="ltr" required/></label>
    </section>}

    {step===3&&<section className="signup-panel">
      <span className="product-eyebrow">{ar?"الخطوة 3 · المالك":"STEP 3 · OWNER"}</span><h2>{ar?"حساب مالك المتجر":"Store owner account"}</h2><p>{ar?"يحصل هذا الحساب على صلاحيات مالك المتجر. فعّل التحقق بخطوتين بعد أول دخول.":"This account receives store owner permissions. Enable two-step verification after first sign-in."}</p>
      <label>{ar?"اسم المالك":"Owner name"}<input value={ownerName} onChange={e=>setOwnerName(e.target.value)} autoComplete="name" required/></label>
      <label>{ar?"اسم المستخدم الرسمي":"Account username"}<div className="account-handle-input"><input value={username} onChange={e=>{setAvailable(null);setUsername(e.target.value.trim().toLowerCase());}} dir="ltr" autoCapitalize="none" autoComplete="off" maxLength={30} spellCheck={false} placeholder="topmobile" required/><strong dir="ltr">@a1mobi.app</strong></div></label>
      <p role="status" aria-live="polite">{available===true?(ar?"الاسم متاح حاليًا؛ يُحجز عند إنشاء الحساب.":"Name currently available; reserved upon signup."):available===false?(ar?"الاسم غير متاح أو تعذر التحقق؛ جرّب اسمًا آخر.":"Unavailable or check failed; try another username."):(ar?"اكتب اسمًا من 3 إلى 30 حرفًا إنكليزيًا أو رقمًا أو _، يبدأ بحرف.":"Enter 3–30 letters, digits or _, starting with a letter.")}</p>
      <label>{ar?"البريد البديل للاسترداد (يحتاج التحقق لاحقًا)":"Recovery email (verification required)"}<input value={recoveryEmail} onChange={e=>setRecoveryEmail(e.target.value)} type="email" dir="ltr" autoComplete="email" required/></label>
      <label>{ar?"كلمة المرور":"Password"}<input value={password} onChange={e=>setPassword(e.target.value)} type="password" minLength={12} autoComplete="new-password" required/><small>{ar?"12 محرفًا على الأقل. لا تستخدم كلمة مرور مهمة في تجربة عامة.":"At least 12 characters. Do not reuse an important password in a public trial."}</small></label>
    </section>}

    {step===4&&<section className="signup-panel review-panel">
      <span className="product-eyebrow">{ar?"الخطوة 4 · المراجعة":"STEP 4 · REVIEW"}</span><h2>{ar?"راجع ثم ابدأ تجربتك المجانية لمدة 14 يومًا":"Review and start your 14-day free trial"}</h2>
      <div className="review-grid">
        <div><small>{ar?"الجهة":"Organization"}</small><strong>{store}</strong></div>
        <div><small>{ar?"معرّف المتجر":"Store ID"}</small><strong dir="ltr">{effectiveSlug}</strong></div>
        <div><small>{ar?"الفرع":"Branch"}</small><strong>{branch}</strong></div>
        <div><small>{ar?"الكود":"Code"}</small><strong dir="ltr">{branchCode}</strong></div>
        <div><small>{ar?"المالك":"Owner"}</small><strong>{ownerName}</strong></div>
        <div><small>{ar?"هوية الدخول":"Login identity"}</small><strong dir="ltr">{email}</strong></div>
        <div><small>{ar?"بريد الاسترداد قيد التحقق":"Recovery email pending verification"}</small><strong dir="ltr">{recoveryEmail}</strong></div>
      </div>
      <AuthTurnstile key={challengeVersion} surface="signup" onToken={onTurnstileToken}/>
      <div className="trial-entitlements"><b>{ar?"يشمل الـPilot":"Pilot includes"}</b><span>POS</span><span>Inventory</span><span>Repairs</span><span>Customers</span><span>Cash</span><span>Top-up</span><span>Reports</span><span>Device Trust</span><span>5 Staff</span><span>1 Branch</span></div>
    </section>}

    {error&&<div className="signup-error" role="alert">{error==="TRIAL_ONBOARDING_DISABLED"?(ar?"التسجيل العام للتجربة غير مفعّل على هذه البيئة. استخدم المتجر التجريبي أو تواصل معنا.":"Public trial signup is not enabled in this environment. Use the populated demo or contact us."):error}</div>}

    <div className="signup-actions">
      {step>1&&<button type="button" className="product-secondary" onClick={()=>setStep(step-1)}>{ar?"السابق":"Back"}</button>}
      {!canNext&&<p className="signup-help" role="status">{ar?(step===1?"أدخل اسم المتجر ومعرّفًا من 3 أحرف على الأقل.":step===2?"أدخل اسم الفرع وكوده للمتابعة.":"أدخل اسم المالك واسم مستخدم متاحًا وبريد استرداد صحيحًا وكلمة مرور من 12 حرفًا على الأقل."):(step===1?"Enter a store name and an identifier of at least 3 characters.":step===2?"Enter a branch name and code to continue.":"Enter an owner, available username, recovery email, and a password of at least 12 characters.")}</p>}
      <button className="product-cta" disabled={!canNext||busy}>{busy?(ar?"جارٍ الإنشاء…":"Creating…"):step===4?(ar?"ابدأ التجربة":"Start trial"):(ar?"التالي":"Continue")}</button>
    </div>
  </form>;
}
