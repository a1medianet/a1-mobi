"use client";
import { useState } from "react";

export function RecoveryEmailVerificationForm({ locale, token }: {locale:"ar"|"en";token:string}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const ar=locale==="ar";
  const valid=/^[A-Za-z0-9_-]{43}$/.test(token);
  async function confirm() {
    setBusy(true);setMessage("");
    try {
      const response=await fetch("/api/auth/recovery-email/confirm", {
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({token}),
      });
      const result=await response.json();
      setMessage(response.ok ? (ar?"تم تأكيد بريد الاسترداد بنجاح.":"Recovery email verified.")
        : result.error==="AUTH_REQUIRED" ? (ar?"سجّل الدخول إلى متجرك ثم أعد المحاولة.":"Sign in to your store and try again.")
        : (ar?"تعذر التحقق؛ قد يكون الرابط منتهي الصلاحية أو مستخدمًا.":"Verification failed; the link may be expired or used."));
    } catch {setMessage(ar?"تعذّر الاتصال بالخادم.":"Could not contact the server.");}
    finally {setBusy(false);}
  }
  return <section dir={ar?"rtl":"ltr"}>
    <button type="button" disabled={!valid||busy} onClick={()=>void confirm()}>
      {busy?(ar?"جارٍ التحقق…":"Verifying…"):(ar?"تأكيد البريد":"Verify email")}
    </button>
    {!valid&&<p>{ar?"الرابط غير صالح.":"Invalid verification link."}</p>}
    {message&&<p role="status" aria-live="polite">{message}</p>}
  </section>;
}
