"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function CashOpenPanel({ locale }: { locale: "ar" | "en" }) {
  const ar = locale === "ar", router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    if (!window.confirm(ar ? "فتح صندوق الفرع بالقيم المدخلة؟" : "Open the branch drawer with these balances?")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/ops/cash/open", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ openingUsd: Number(data.get("usd")), openingLbp: Number(data.get("lbp")),
          openingExchangeRate: Number(data.get("rate")), confirmed: true }) });
      if (!response.ok) throw new Error("FAILED");
      router.refresh();
    } catch { setError(ar ? "تعذّر فتح الصندوق. حدّث الصفحة وتحقق من القيم والصلاحيات." : "Could not open drawer. Refresh and check balances and permissions."); }
    finally { setBusy(false); }
  }
  return <section className="activity-card"><h2>{ar ? "فتح جلسة صندوق" : "Open cash session"}</h2>
    <form onSubmit={event => void submit(event)}>
      <label>{ar ? "الرصيد الافتتاحي USD" : "Opening USD"}<input name="usd" type="number" min="0" max="1000000000" step="0.01" defaultValue="0" required /></label>
      <label>{ar ? "الرصيد الافتتاحي LBP" : "Opening LBP"}<input name="lbp" type="number" min="0" max="1000000000" step="1" defaultValue="0" required /></label>
      <label>{ar ? "سعر الصرف LBP لكل USD" : "Exchange rate: LBP per USD"}<input name="rate" type="number" min="0.01" max="1000000000" step="0.01" required /></label>
      <button className="primary" disabled={busy}>{busy ? (ar ? "جارٍ الفتح…" : "Opening…") : (ar ? "فتح الصندوق" : "Open drawer")}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  </section>;
}
