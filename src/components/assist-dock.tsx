"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useState } from "react";

export function AssistDock({locale}:{locale:"ar"|"en"}){
  const ar=locale==="ar";
  const pathname=usePathname();
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [answer,setAnswer]=useState("");
  const [helpUrl,setHelpUrl]=useState("");
  const [mode,setMode]=useState<"assist"|"guide"|null>(null);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget;
    const question=String(new FormData(form).get("question")||"").trim();
    if(question.length<2||busy)return;
    setBusy(true);setAnswer("");setHelpUrl("");setMode(null);
    try{
      const response=await fetch("/api/assist",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({question,locale,route:pathname}),
      });
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||"ASSIST_UNAVAILABLE");
      setAnswer(String(body.answer||""));
      setHelpUrl(String(body.helpUrl||""));
      setMode(body.mode==="assist"?"assist":"guide");
    }catch{
      setAnswer(ar?"تعذر فتح المساعد الآن. يمكنك متابعة دليل الاستخدام مباشرة.":"Assistant is unavailable right now. Continue with the Help Center.");
      setHelpUrl("/product/"+locale+"/help");
      setMode("guide");
    }finally{setBusy(false)}
  }

  return <>
    <button className="assist-launcher" type="button" onClick={()=>setOpen(value=>!value)} aria-expanded={open} aria-controls="a1-assist-panel">
      <span aria-hidden="true">A1</span>{ar?"مساعد":"Assist"}
    </button>
    {open&&<aside id="a1-assist-panel" className="assist-panel" aria-label={ar?"مساعد A1 Mobi":"A1 Mobi Assist"}>
      <header><div><small>A1 ASSIST</small><strong>{ar?"كيف أساعدك في Mobi؟":"How can I help with Mobi?"}</strong></div><button type="button" onClick={()=>setOpen(false)} aria-label={ar?"إغلاق":"Close"}>×</button></header>
      <p>{ar?"اسأل عن البيع أو المخزون أو الصيانة أو الحساب أو الصلاحيات. لن ينفذ المساعد إجراءً حساسًا من هذه النافذة.":"Ask about sales, inventory, repairs, account or permissions. This panel does not execute sensitive actions."}</p>
      <form onSubmit={submit}><textarea name="question" maxLength={1200} required placeholder={ar?"مثال: كيف أضيف فرعًا جديدًا؟":"e.g. How do I add another branch?"}/><button className="primary" disabled={busy}>{busy?(ar?"جارٍ البحث…":"Checking…"):(ar?"اسأل":"Ask")}</button></form>
      {answer&&<div className="assist-answer"><span className={"assist-mode "+(mode||"guide")}>{mode==="assist"?"A1 Assist":ar?"الدليل":"Guide"}</span><p>{answer}</p>{helpUrl&&<Link href={helpUrl}>{ar?"فتح القسم في الدليل":"Open guide section"} →</Link>}</div>}
      <footer><Link href={"/product/"+locale+"/help"}>{ar?"دليل الاستخدام الكامل":"Full Help Center"}</Link></footer>
    </aside>}
  </>;
}
