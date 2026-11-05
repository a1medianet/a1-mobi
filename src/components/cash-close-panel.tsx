"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Preview = { status: "PREVIEW_ONLY"; expectedBase: number; physicalBase: number;
  varianceBase: number; requiresApproval: boolean };
const labels = {
  ar: { heading: "إغلاق الصندوق", hint: "عدّ النقد الفعلي قبل الإغلاق. تُحسب الفروقات من سجل الحركات المحفوظ، وليس من أرقام العرض.",
    usd: "المبلغ المعدود بالدولار", lbp: "المبلغ المعدود بالليرة", rate: "سعر الدولار بالليرة عند الإغلاق",
    preview: "معاينة الفروقات", expected: "الرصيد المحاسبي بالدولار", physical: "قيمة النقد المعدود بالدولار",
    diff: "الفرق بالدولار", approve: "المسؤول المعتمِد", reason: "سبب الفرق",
    select: "اختر مسؤولًا آخر مخوّلًا", confirm: "أؤكد العدّ وأغلق الصندوق",
    warning: "هذه معاينة فقط وقد تتغير مع الحركات الجديدة؛ يتحقق النظام من الرصيد مجددًا عند الإغلاق.",
    noApprover: "لا يوجد مسؤول آخر مخوّل بهذا الفرع. لا يمكن إغلاق صندوق بفروقات دون اعتماده.",
    closed: "تم إغلاق الصندوق وتسجيل نتيجة العدّ بنجاح.", failure: "لم يتم الإغلاق. راجع الأرقام أو صلاحيات المسؤول.",
    required: "إغلاق الصندوق بفروقات يتطلب موافقة مسؤول آخر بعد تسجيل دخوله مستقلًا. هذا الإجراء غير مفعّل في النسخة التجريبية." },
  en: { heading: "Close cash drawer", hint: "Count physical cash before closing. Variance is calculated from saved ledger entries, not demo balances.",
    usd: "Counted USD", lbp: "Counted LBP", rate: "Closing LBP per USD rate",
    preview: "Preview variance", expected: "Ledger expected USD", physical: "Counted cash value USD",
    diff: "Variance USD", approve: "Approving manager", reason: "Variance reason",
    select: "Select a different authorized manager", confirm: "Confirm count and close drawer",
    warning: "Preview only; new transactions may change the total. The ledger is verified again when you close.",
    noApprover: "No other authorized manager is available in this branch. A variance cannot be approved.",
    closed: "Drawer closed and count recorded.", failure: "Drawer was not closed. Check count or approver permissions.",
    required: "Variance close requires a separately authenticated manager. This action is not enabled in the pilot." },
} as const;

export default function CashClosePanel({ locale, cashSessionId, openingRate }: {
  locale: "ar" | "en"; cashSessionId: string; openingRate: number;
}) {
  const t = labels[locale];
  const router = useRouter();
  const [usd, setUsd] = useState("0");
  const [lbp, setLbp] = useState("0");
  const [rate, setRate] = useState(String(openingRate));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const invalidate = () => { setPreview(null); setError(""); };
  const amounts = () => ({
    cashSessionId, physicalUsd: Number(usd), physicalLbp: Number(lbp),
    closingExchangeRate: Number(rate),
  });
  async function submit(action: "preview" | "close") {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const body = action === "preview"
        ? { action, ...amounts() }
        : { action, ...amounts(), confirmed: true };
      const response = await fetch("/api/ops/cash/close", {
        method: "POST", headers: { "content-type": "application/json" },
        credentials: "same-origin", cache: "no-store", body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) { setPreview(null); setError(t.failure + " (" + String(data.error || response.status) + ")"); return; }
      if (action === "preview") {
        if (data.status !== "PREVIEW_ONLY") throw Error("INVALID_PREVIEW");
        setPreview(data as Preview);
      } else {
        if (data.status !== "CLOSED") throw Error("INVALID_CLOSE_STATUS");
        setPreview(null); setSuccess(true); router.refresh();
      }
    } catch { setPreview(null); setError(t.failure); }
    finally { setBusy(false); }
  }
  const validCounts = usd.trim() !== "" && lbp.trim() !== "" && rate.trim() !== "" &&
    [Number(usd), Number(lbp), Number(rate)].every(Number.isFinite) &&
    Number(usd) >= 0 && Number(lbp) >= 0 && Number(rate) > 0;
  const canClose = Boolean(preview && !preview.requiresApproval);
  return <section className="activity-card cash-close-panel" aria-label={t.heading} dir={locale === "ar" ? "rtl" : "ltr"}>
    <div className="section-head"><div><h2>{t.heading}</h2><p>{t.hint}</p></div></div>
    <div className="cash-close-fields">
      {([{ label: t.usd, value: usd, change: setUsd, step: "0.01" },
        { label: t.lbp, value: lbp, change: setLbp, step: "1" },
        { label: t.rate, value: rate, change: setRate, step: "0.01" }] as const)
        .map(field => <label key={field.label}>{field.label}
          <input type="number" min={0} step={field.step} value={field.value}
            disabled={busy || success} onChange={e => { field.change(e.target.value); invalidate(); }} />
        </label>)}
    </div>
    {!success && <button type="button" className="primary" disabled={!validCounts || busy}
      onClick={() => void submit("preview")}>{t.preview}</button>}
    {preview && <div className="cash-close-preview" role="status">
      <p>{t.expected}: <strong>{preview.expectedBase.toFixed(2)} USD</strong></p>
      <p>{t.physical}: <strong>{preview.physicalBase.toFixed(2)} USD</strong></p>
      <p>{t.diff}: <strong>{preview.varianceBase.toFixed(2)} USD</strong></p>
      <p>{t.warning}</p>
      {preview.requiresApproval && <p role="alert">{t.required}</p>}
      <button type="button" className="primary" disabled={!canClose || busy}
        onClick={() => void submit("close")}>{t.confirm}</button>
    </div>}
    {error && <p role="alert" className="cash-close-error">{error}</p>}
    {success && <p role="status" className="cash-close-success">{t.closed}</p>}
  </section>;
}
