"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import styles from "./operation-forms.module.css";
import type {EngagementRecord} from "@/modules/engagement/engagement-store";
export default function EngagementPanel({locale,type,initial,customers}:{
  locale:"ar"|"en";type:"FOLLOWUP"|"CAMPAIGN";initial:EngagementRecord[];
  customers:{id:string;name:string}[];
}){
  const ar=locale==="ar",follow=type==="FOLLOWUP",router=useRouter();
  const [records,setRecords]=useState(initial);
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy)return;
    const form=event.currentTarget,d=new FormData(form);
    const draft={
      action:"CREATE" as const,type,
      title:String(d.get("title")||"").trim(),
      detail:String(d.get("detail")||"").trim(),
      ...(String(d.get("customerId")||"")?{customerId:String(d.get("customerId"))}:{}),
      channel:follow?"INTERNAL":String(d.get("channel")||"EMAIL"),
      ...(follow&&d.get("dueAt")?{dueAt:new Date(String(d.get("dueAt"))).toISOString()}:{}),
      confirmed:true,
    };
    setBusy(true);setNotice("");
    try{
      const response=await fetch("/api/ops/engagement",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"content-type":"application/json"},body:JSON.stringify(draft),
      });
      if(!response.ok)throw Error(String((await response.json()).error));
      form.reset();setNotice(ar?"تم الحفظ بنجاح":"Saved successfully");router.refresh();
      const list=await fetch("/api/ops/engagement?type="+type,{cache:"no-store"});
      if(list.ok)setRecords((await list.json()).records);
    }catch{setNotice(ar?"تعذر الحفظ، يرجى المحاولة من جديد.":"Could not save; please retry.")}
    finally{setBusy(false);}
  }
  async function complete(id:string){
    if(busy)return;
    setBusy(true);
    try{
      const res=await fetch("/api/ops/engagement",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({action:"COMPLETE",type:"FOLLOWUP",id,confirmed:true}),
      });
      if(!res.ok)throw Error();
      setRecords(current=>current.map(r=>r.id===id?{...r,status:"DONE"}:r));
      router.refresh();
    }catch{setNotice(ar?"تعذر تحديث المتابعة":"Could not update follow-up");}
    finally{setBusy(false);}
  }
  return <div style={{display:"grid",gap:18}}>
    <section className="activity-card" style={{padding:20}}>
      <h2>{follow?(ar?"متابعة جديدة":"New follow-up"):(ar?"حملة جديدة":"New campaign")}</h2>
      <form className={styles.form} onSubmit={e=>void submit(e)}>
        <label>{ar?"العنوان":"Title"}<input name="title" required minLength={3} maxLength={120}/></label>
        {follow&&<label>{ar?"العميل":"Customer"}<select name="customerId" style={{display:"block",width:"100%",minHeight:43}}>
          <option value="">{ar?"متابعة عامة":"General follow-up"}</option>
          {customers.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}
        </select></label>}
        {!follow&&<label>{ar?"القناة المقترحة":"Planned channel"}
          <select name="channel" style={{display:"block",width:"100%",minHeight:43}}>
            <option value="EMAIL">{ar?"البريد الإلكتروني":"Email"}</option>
            <option value="WHATSAPP">WhatsApp</option><option value="SMS">SMS</option>
          </select>
        </label>}
        <label>{ar?"التفاصيل":"Details"}
          <textarea name="detail" rows={3} minLength={5} maxLength={1200} required style={{display:"block",width:"100%"}}/>
        </label>
        {follow&&<label>{ar?"موعد المتابعة":"Follow-up date"}
          <input type="datetime-local" name="dueAt" style={{display:"block",width:"100%"}}/>
        </label>}
        <button className="primary" type="submit" disabled={busy}>{busy?(ar?"جارٍ الحفظ":"Saving"):
          follow?(ar?"حفظ المتابعة":"Save follow-up"):(ar?"حفظ مسودة الحملة":"Save campaign draft")}</button>
      </form>
      {notice&&<p role="status">{notice}</p>}
    </section>
    <section className="activity-card" style={{padding:20}}>
      <h2>{follow?(ar?"قائمة المتابعات":"Follow-up list"):(ar?"مسودات الحملات":"Campaign drafts")}</h2>
      {records.length===0?<p>{ar?"لا توجد سجلات بعد.":"No records yet."}</p>:
        <div style={{display:"grid",gap:10,marginTop:12}}>
          {records.map(r=><article key={r.id} style={{padding:13,border:"1px solid #dce5f1",borderRadius:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <strong>{r.title}</strong><span>{r.status==="DONE"?(ar?"مكتملة":"Done"):r.status==="DRAFT"?(ar?"مسودة":"Draft"):(ar?"مفتوحة":"Open")}</span>
            </div>
            <p style={{whiteSpace:"pre-wrap",marginBlock:7}}>{r.detail}</p>
            {r.dueAt&&<small>{new Date(r.dueAt).toLocaleString(ar?"ar-LB":"en-GB")}</small>}
            {follow&&r.status==="OPEN"&&<p><button type="button" disabled={busy} onClick={()=>void complete(r.id)}>{ar?"إتمام المتابعة":"Mark complete"}</button></p>}
          </article>)}
        </div>}
    </section>
  </div>;
}
