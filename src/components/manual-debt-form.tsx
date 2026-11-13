"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./operation-forms.module.css";

export default function ManualDebtForm({locale,customers,enabled}:{
  locale:"ar"|"en";enabled:boolean;customers:{id:string;name:string}[];
}){
  const ar=locale==="ar",router=useRouter();
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState("");
  const pending=useRef<{fingerprint:string;idempotencyKey:string}|null>(null);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy||!enabled)return;
    const form=event.currentTarget,data=new FormData(form);
    const reason=String(data.get("reason")||"").trim();
    const customerId=String(data.get("customerId")||"");
    const currency=String(data.get("currency")||"USD");
    const amount=String(data.get("amount")||"");
    const fingerprint=JSON.stringify([customerId,currency,amount,reason]);
    if(!pending.current||pending.current.fingerprint!==fingerprint)
      pending.current={fingerprint,idempotencyKey:crypto.randomUUID()};
    if(!confirm(ar?"تأكيد إضافة مبلغ مستحق إلى حساب العميل؟":"Confirm posting this amount to the customer's account?"))return;
    setBusy(true);setNotice("");
    try{
      const response=await fetch("/api/ops/debts",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          customerId,currency,amount,reason,
          idempotencyKey:pending.current!.idempotencyKey,confirmed:true,
        }),
      });
      const result=await response.json();
      if(!response.ok)throw Error(String(result.error||response.status));
      pending.current=null;
      form.reset();setNotice(ar?"تم تسجيل المبلغ المستحق في حساب العميل.":"Amount added to the customer's account.");
      router.refresh();
    }catch(error){
      const code=error instanceof Error?error.message:"";
      const messages:Record<string,[string,string]>={
        CURRENT_EXCHANGE_RATE_REQUIRED:["يجب تحديث سعر الصرف قبل التسجيل.","Update the exchange rate first."],
        DEBT_RECONCILIATION_REQUIRED:["يتطلب حساب العميل مراجعة قبل إضافة مبلغ جديد.","Customer account requires reconciliation."],
        INVALID_DEBT_INPUT:["تحقق من المبلغ والسبب.","Check the amount and reason."],
      };
      setNotice(messages[code]?.[ar?0:1]||(ar?"تعذر تسجيل الدين.":"Could not record amount."));
    }finally{setBusy(false);}
  }
  return <section className="activity-card" style={{padding:20,marginBlock:18}}>
    <h2>{ar?"إضافة مبلغ مستحق":"Add amount due"}</h2>
    {!enabled&&<p role="status">{ar?"إضافة مبالغ جديدة غير متاحة حاليًا.":"New amount entry is currently unavailable."}</p>}
    <form className={styles.form} onSubmit={event=>void submit(event)}>
      <fieldset disabled={!enabled||busy} style={{border:0,padding:0,margin:0,display:"grid",gap:14}}>
      <label>{ar?"العميل":"Customer"}
        <select name="customerId" required defaultValue="" style={{display:"block",width:"100%",minHeight:44}}>
          <option value="" disabled>{ar?"اختر العميل":"Choose customer"}</option>
          {customers.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}
        </select>
      </label>
      <div className={styles.twoColumns}>
        <label>{ar?"المبلغ":"Amount"}<input name="amount" type="number" min="0.0001" step="0.0001" required/></label>
        <label>{ar?"العملة":"Currency"}<select name="currency" defaultValue="USD" style={{width:"100%",minHeight:43}}><option value="USD">USD</option><option value="LBP">LBP</option></select></label>
      </div>
      <label>{ar?"سبب المبلغ المستحق":"Reason"}
        <textarea name="reason" minLength={8} maxLength={300} required rows={2} style={{display:"block",width:"100%"}}/>
      </label>
      <button className="primary" disabled={busy||customers.length===0} type="submit">{busy?(ar?"جارٍ الحفظ":"Saving"):(ar?"تسجيل الدين":"Record amount due")}</button>
      </fieldset>
      {notice&&<p role="status">{notice}</p>}
    </form>
  </section>;
}
