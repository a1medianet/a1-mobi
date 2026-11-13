"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function CustomerCreatePanel({locale}:{locale:"ar"|"en"}){
  const ar=locale==="ar",router=useRouter();
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy)return;
    const form=event.currentTarget;
    const data=new FormData(form);
    setBusy(true);setError("");setSuccess("");
    try{
      const response=await fetch("/api/ops/customers",{
        method:"POST",headers:{"content-type":"application/json"},
        credentials:"same-origin",cache:"no-store",
        body:JSON.stringify({
          name:String(data.get("name")??"").trim(),
          phone:String(data.get("phone")??"").trim(),
          email:String(data.get("email")??"").trim(),
          notes:String(data.get("notes")??"").trim(),
          confirmed:true,
        }),
      });
      const result=await response.json();
      if(!response.ok)throw Error(String(result.error??response.status));
      form.reset();
      setSuccess(ar?"تم تسجيل العميل في قاعدة البيانات بنجاح.":"Customer saved successfully.");
      router.refresh();
    }catch(error){
      const code=error instanceof Error?error.message:"";
      setError(code==="CUSTOMER_PHONE_EXISTS"?
        (ar?"هذا الهاتف مسجل مسبقًا؛ ابحث عن ملف العميل بدل تكراره.":"Phone already registered; use the existing customer.") :
        (ar?"لم يُحفظ العميل: "+code:"Customer was not saved: "+code));
    }finally{setBusy(false);}
  }
  return <details className="activity-card customer-create-panel" style={{marginBlock:"14px 16px",padding:"16px"}}>
    <summary style={{cursor:"pointer",fontSize:"1.05rem",fontWeight:700,padding:"12px 16px",borderRadius:"10px",background:"#2375dc",color:"#fff",width:"fit-content",listStyle:"none"}}>
      {ar?"＋ إضافة عميل جديد":"＋ Register a customer"}</summary>
    <form onSubmit={event=>void submit(event)} dir={ar?"rtl":"ltr"}>
      <div className="cash-close-fields">
        <label>{ar?"اسم العميل":"Customer name"}<input name="name" required minLength={2} maxLength={140} autoComplete="name"/></label>
        <label>{ar?"رقم الهاتف":"Phone number"}<input name="phone" type="tel" required minLength={7} maxLength={32} autoComplete="tel" dir="ltr"/></label>
        <label>{ar?"البريد الإلكتروني (اختياري)":"Email (optional)"}<input name="email" type="email" maxLength={240} autoComplete="email"/></label>
      </div>
      <label style={{display:"block",marginBlock:"10px"}}>
        {ar?"ملاحظات العميل (اختيارية)":"Customer notes (optional)"}
        <textarea name="notes" maxLength={1500} rows={2} style={{width:"100%"}}/>
      </label>
      <button className="primary" type="submit" disabled={busy}>
        {busy?(ar?"جارٍ الحفظ…":"Saving…"):(ar?"حفظ العميل":"Save customer")}</button>
      {error&&<p role="alert" style={{marginBlock:8}}>{error}</p>}
      {success&&<p role="status" style={{marginBlock:8}}>{success}</p>}
    </form>
  </details>;
}
