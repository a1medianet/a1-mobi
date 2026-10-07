"use client";

import { FormEvent, useEffect, useState } from "react";

type Branch={id:string;code:string;name:string;createdAt:string;_count?:{users:number}};

export function BranchManager({locale}:{locale:"ar"|"en"}){
  const ar=locale==="ar";
  const [branches,setBranches]=useState<Branch[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function load(){
    setLoading(true);
    try{
      const response=await fetch("/api/account/branches",{cache:"no-store"});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||"Unable to load branches");
      setBranches(body.branches||[]);
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to load branches")}
    finally{setLoading(false)}
  }

  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/account/branches",{cache:"no-store",signal:controller.signal})
      .then(async response=>{
        const body=await response.json();
        if(!response.ok)throw new Error(body.error||"Unable to load branches");
        setBranches(body.branches||[]);
      })
      .catch(error=>{if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:"Unable to load branches")})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
    return()=>controller.abort();
  },[]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy)return;
    const form=event.currentTarget;
    const fields=new FormData(form);
    setBusy(true);setMessage("");
    try{
      const response=await fetch("/api/account/branches",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({code:fields.get("code"),name:fields.get("name")}),
      });
      const body=await response.json();
      if(!response.ok){
        if(body.error==="BRANCH_LIMIT_REACHED")throw new Error(ar?"وصلت إلى حد الفروع في خطتك الحالية.":"Your current plan branch limit has been reached.");
        if(body.error==="SUBSCRIPTION_REQUIRED")throw new Error(ar?"يلزم اشتراك نشط لإضافة فرع.":"An active subscription is required to add a branch.");
        if(body.error==="ENTITLEMENT_UNAVAILABLE")throw new Error(ar?"تعذر التحقق من صلاحيات الخطة الآن.":"Plan entitlements could not be verified.");
        throw new Error(body.error||"Unable to add branch");
      }
      form.reset();
      setMessage(ar?"تم إنشاء الفرع.":"Branch created.");
      await load();
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to add branch")}
    finally{setBusy(false)}
  }

  return <section className="account-card branch-manager">
    <div className="branch-head"><div><span className="module-kicker">BRANCHES</span><h2>{ar?"فروع الجهة":"Organization branches"}</h2></div><span className="period">{loading?"…":branches.length}</span></div>
    <div className="branch-list">{branches.map(branch=><article key={branch.id}><div><strong>{branch.name}</strong><small>{branch.code}</small></div><span>{branch._count?.users??0} {ar?"مستخدم":"users"}</span></article>)}</div>
    <form className="branch-form" onSubmit={submit}><div><label>{ar?"اسم الفرع":"Branch name"}<input name="name" placeholder={ar?"مثال: الميناء":"e.g. Mina"} required/></label><label>{ar?"كود الفرع":"Branch code"}<input name="code" placeholder="MINA" dir="ltr" pattern="[A-Za-z0-9_-]+" required/></label></div><button className="soft-btn" disabled={busy}>{busy?(ar?"جارٍ الإضافة…":"Adding…"):(ar?"إضافة فرع":"Add branch")}</button></form>
    {message&&<p className="branch-message" role="status">{message}</p>}
  </section>;
}
