"use client";
import { useState } from "react";

export function RecoveryEmailRequestButton({locale}:{locale:"ar"|"en"}) {
  const ar = locale === "ar";
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  async function requestVerification() {
    setBusy(true);setMessage("");
    try {
      const response = await fetch("/api/auth/recovery-email/request", {
        method:"POST",headers:{"accept-language":locale},
      });
      const data = await response.json();
      setMessage(response.ok && data.sent
        ? (ar?"أُرسل رابط التأكيد إلى بريد الاسترداد. صالح لمدة 30 دقيقة.":"Verification link sent to your recovery address; valid for 30 minutes.")
        : (ar?"تعذر إرسال الرابط. تحقق من إعدادات البريد أو حاول لاحقًا.":"Could not send the link. Check mail configuration or try later."));
    } catch {setMessage(ar?"تعذر الاتصال بالخادم.":"Unable to contact the server.");}
    finally {setBusy(false);}
  }
  return <div>
    <button type="button" disabled={busy} onClick={()=>void requestVerification()}>
      {busy?(ar?"جارٍ الإرسال…":"Sending…"):(ar?"إرسال رابط تأكيد البريد":"Send verification link")}
    </button>
    {message && <p role="status" aria-live="polite">{message}</p>}
  </div>;
}
