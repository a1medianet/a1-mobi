"use client";
import {useState} from "react";

export function RecoveryEmailRequestButton({locale}:{locale:"ar"|"en"}){
 const ar=locale==="ar";
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [sent,setSent]=useState(false);
 async function requestVerification(){
  if(busy||sent)return;
  setBusy(true);setMessage("");
  try{
   const response=await fetch("/api/auth/recovery-email/request",{
    method:"POST",headers:{"accept-language":locale},cache:"no-store",
   });
   const payload=await response.json().catch(()=>({})) as {sent?:boolean;error?:string};
   if(response.ok&&payload.sent===true){
    setSent(true);
    setMessage(ar?"أُرسل رابط التحقق إلى البريد البديل. افتح الرسالة واضغط تأكيد خلال 30 دقيقة.":
     "A verification link was sent. Open the email and confirm within 30 minutes.");
   }else if(response.status===429){
    setMessage(ar?"عدد محاولات الإرسال تجاوز الحد. حاول لاحقًا.":"Too many attempts. Please try later.");
   }else if(response.status===401||response.status===403){
    setMessage(ar?"انتهت الجلسة أو لا تملك الصلاحية. سجّل الدخول مجددًا.":"Session expired or permission denied. Sign in again.");
   }else{
    setMessage(ar?"لم يُرسل رابط التفعيل. خدمة البريد غير متاحة حاليًا؛ لم يُوثّق بريدك بعد.":
     "Verification email was not sent. Mail delivery is currently unavailable; your address remains unverified.");
   }
  }catch{
   setMessage(ar?"تعذّر الاتصال بالخادم. لم يُوثّق البريد.":"Unable to contact the server. Email remains unverified.");
  }finally{setBusy(false);}
 }
 return <div className="mt-3 space-y-2">
  <button type="button" className="primary inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 font-semibold shadow-sm"
   disabled={busy||sent} aria-busy={busy} onClick={()=>void requestVerification()}>
   {busy?(ar?"جارٍ إرسال رابط التفعيل…":"Sending verification link…"):
    sent?(ar?"تم إرسال الرابط":"Verification email sent"):
    (ar?"تفعيل بريد الاسترداد":"Activate recovery email")}
  </button>
  {message&&<p role="status" aria-live="polite" className={sent?"text-sm text-emerald-700":"text-sm text-amber-800"}>{message}</p>}
 </div>;
}
