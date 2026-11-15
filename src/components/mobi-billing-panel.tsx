"use client";

import { useState } from "react";
import type { MobiEntitlementSnapshot } from "@/server/billing-client";

type Plan = "mobi-monthly" | "mobi-annual";
const prices: Record<Plan, number> = { "mobi-monthly": 20, "mobi-annual": 200 };
export function MobiBillingPanel({ locale, initial }: {
  locale: "ar" | "en"; initial: MobiEntitlementSnapshot | null;
}) {
  const ar = locale === "ar";
  const [snapshot, setSnapshot] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [asOf, setAsOf] = useState(Date.now);
  async function fetchStatus() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/billing/mobi", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "SERVICE_UNAVAILABLE");
      setSnapshot(data.entitlement);
      setAsOf(Date.now());
    } catch (cause) { setError(cause instanceof Error ? cause.message : "SERVICE_UNAVAILABLE"); }
    finally { setBusy(false); }
  }
  async function action(data: { action: "START_TRIAL" } | { action: "CHECKOUT"; planCode: Plan }) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/billing/mobi?locale=" + locale, {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "SERVICE_UNAVAILABLE");
      if (data.action === "START_TRIAL") { setSnapshot(result.entitlement); setAsOf(Date.now()); }
      else if (typeof result.checkoutUrl === "string") window.location.assign(result.checkoutUrl);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "SERVICE_UNAVAILABLE"); }
    finally { setBusy(false); }
  }
  const expiry = snapshot?.expiresAt && Date.parse(snapshot.expiresAt);
  const expired = !!expiry && expiry <= asOf;
  const access = !!snapshot && !expired && (snapshot.status === "trialing" || snapshot.status === "active") && snapshot.features["mobi.access"] === "true";
  const status = !snapshot ? (ar ? "غير متوفر حاليًا" : "Unavailable") :
    expired ? (ar ? "انتهت الصلاحية" : "Expired") :
    snapshot.status === "trialing" ? (ar ? "تجربة مجانية" : "Free trial") :
    snapshot.status === "active" ? (ar ? "اشتراك فعّال" : "Active") : snapshot.status;
  return <section aria-label={ar ? "اشتراك A1 Mobi" : "A1 Mobi subscription"} style={{display:"grid",gap:12}}>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
      <strong>{ar ? "الاشتراك والتجربة" : "Subscription & trial"}</strong>
      <span role="status">{status}</span>
      <button type="button" className="soft-btn" onClick={()=>void fetchStatus()} disabled={busy}>{ar ? "تحديث الحالة" : "Refresh status"}</button>
    </div>
    {snapshot?.expiresAt && <p>{ar ? "تاريخ انتهاء الصلاحية: " : "Access until: "}<time dateTime={snapshot.expiresAt}>{new Intl.DateTimeFormat(ar?"ar-LB":"en-US",{dateStyle:"medium",timeZone:"Asia/Beirut"}).format(new Date(snapshot.expiresAt))}</time></p>}
    {access && <p>{ar ? "المزايا المسموح بها فعّالة حاليًا." : "Your current plan entitlements are active."}</p>}
    {!snapshot || snapshot.status === "none" ? <div>
      <p>{ar ? "جرّب A1 Mobi لمدة 14 يومًا مجانًا، بلا بطاقة دفع، مرة واحدة لكل متجر." : "Try A1 Mobi for 14 days without a card, once per store."}</p>
      <button type="button" className="primary" disabled={busy} onClick={()=>void action({action:"START_TRIAL"})}>{ar ? "بدء تجربة 14 يومًا" : "Start 14-day trial"}</button>
    </div> : null}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:12}}>
      {(["mobi-monthly","mobi-annual"] as const).map(plan=><div key={plan} style={{border:"1px solid var(--border,#ddd)",padding:14,borderRadius:12,display:"grid",gap:8}}>
        <strong>{plan==="mobi-monthly" ? (ar?"شهري":"Monthly"):(ar?"سنوي":"Annual")}</strong>
        <span dir="ltr">{prices[plan]} USD / {plan==="mobi-monthly"?(ar?"شهر":"month"):(ar?"سنة":"year")}</span>
        <button type="button" className="primary" disabled={busy} onClick={()=>void action({action:"CHECKOUT",planCode:plan})}>{ar ? "الانتقال للدفع الآمن" : "Continue to secure checkout"}</button>
      </div>)}
    </div>
    <p style={{fontSize:13}}>{ar ? "التجديد التلقائي للخطة الشهرية: إيقافه وإدارته غير متاحين بعد في واجهة Billing التجريبية. لن نعرض مفتاحًا غير فعّال." : "Monthly auto-renewal controls await Billing API support; no misleading switch is shown."}</p>
    {error && <p role="alert" style={{color:"var(--danger,#b42318)"}}>{error === "SUBSCRIPTION_EXISTS" ? (ar?"استُخدمت التجربة لهذا المتجر سابقًا.":"This store already used its trial.") : error}</p>}
  </section>;
}
