"use client";

import { useEffect, useState } from "react";

type Part = { id: string; sku: string; nameAr: string; nameEn: string; type: string };
type Variant = { id: string; name: string; model: string; family: string; manufacturer: string };
type Match = { deviceVariantId: string; notes: string | null; deviceVariant: { name: string; model: { name: string } } };
const endpoint = "/api/ops/catalog/compatibility";

export function PartCompatibilityPanel({ locale, products }: { locale: "ar" | "en"; products: Part[] }) {
  const ar = locale === "ar";
  const parts = products.filter(p => p.type === "PART");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [partId, setPartId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const currentPart = parts.find(p => p.id === partId);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then(async r => { if (!r.ok) throw new Error("LOAD_FAILED"); return r.json(); })
      .then(data => { if (!controller.signal.aborted) setVariants(data.variants ?? []); })
      .catch(() => { if (!controller.signal.aborted) setMessage(ar ? "تعذّر تحميل طرازات الأجهزة." : "Could not load device variants."); });
    return () => controller.abort();
  }, [ar]);
  useEffect(() => {
    if (!partId) return;
    const controller = new AbortController();
    void fetch(endpoint + "?productId=" + encodeURIComponent(partId), { cache: "no-store", signal: controller.signal })
      .then(async r => { if (!r.ok) throw new Error("LOAD_FAILED"); return r.json(); })
      .then(data => { if (!controller.signal.aborted) setMatches(data.compatibilities ?? []); })
      .catch(() => { if (!controller.signal.aborted) setMessage(ar ? "تعذّر تحميل علاقات التوافق." : "Could not load compatibility links."); });
    return () => controller.abort();
  }, [partId, ar]);
  async function mutate(action: "link" | "unlink", deviceVariantId: string) {
    if (!partId || !deviceVariantId || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, productId: partId, deviceVariantId }),
      });
      if (!response.ok) throw new Error("SAVE_FAILED");
      const updated = await fetch(endpoint + "?productId=" + encodeURIComponent(partId), { cache: "no-store" });
      if (!updated.ok) throw new Error("LOAD_FAILED");
      setMatches((await updated.json()).compatibilities ?? []);
      setMessage(action === "link" ? (ar ? "تم ربط القطعة بالطراز." : "Compatibility saved.") : (ar ? "تم حذف علاقة التوافق." : "Compatibility removed."));
      setVariantId("");
    } catch {
      setMessage(ar ? "تعذّر حفظ التوافق. تحقق من الصلاحيات ثم أعد المحاولة." : "Could not save compatibility. Check permissions and retry.");
    } finally { setBusy(false); }
  }
  return <section className="catalog-panel" aria-label={ar ? "توافق قطع الصيانة" : "Repair parts compatibility"}>
    <h2>{ar ? "توافق قطع الصيانة مع الأجهزة" : "Repair part compatibility"}</h2>
    <p>{ar ? "اختر قطعة صيانة، ثم اربطها بنسخ الأجهزة المناسبة. يُحفظ التوافق لكل متجر على حدة." : "Choose a repair part and link the supported device variants. Links are scoped to your store."}</p>
    <div className="mobi-catalog-form">
      <label>{ar ? "قطعة الصيانة" : "Repair part"}
        <select value={partId} onChange={event => { setPartId(event.target.value); setMatches([]); setVariantId(""); setMessage(""); }}>
          <option value="">{ar ? "اختر قطعة" : "Choose a part"}</option>
          {parts.map(p => <option key={p.id} value={p.id}>{ar ? p.nameAr : p.nameEn} · {p.sku}</option>)}
        </select>
      </label>
      <label>{ar ? "نسخة الجهاز المتوافقة" : "Compatible device variant"}
        <select disabled={!partId || busy} value={variantId} onChange={event => setVariantId(event.target.value)}>
          <option value="">{ar ? "اختر الطراز والنسخة" : "Choose model and variant"}</option>
          {variants.filter(v => !matches.some(m => m.deviceVariantId === v.id)).map(v =>
            <option key={v.id} value={v.id}>{v.manufacturer} · {v.model} · {v.name}</option>)}
        </select>
      </label>
      <button type="button" className="primary" disabled={!partId || !variantId || busy} onClick={() => void mutate("link", variantId)}>
        {ar ? "إضافة التوافق" : "Add compatibility"}
      </button>
    </div>
    {message && <p role="status">{message}</p>}
    {currentPart && <div>
      <h3>{ar ? "الأجهزة المتوافقة" : "Compatible devices"} · {ar ? currentPart.nameAr : currentPart.nameEn}</h3>
      {matches.length === 0 && <p>{ar ? "لا توجد طرازات مرتبطة بعد." : "No linked variants yet."}</p>}
      <ul style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", padding: 0, listStyle: "none" }}>
        {matches.map(m => <li key={m.deviceVariantId} style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem", padding: "0.45rem 0.65rem", border: "1px solid #dbe5f1", borderRadius: "0.75rem", background: "#f8fbff" }}>
          <span>{m.deviceVariant.model.name} · {m.deviceVariant.name}</span>
          <button type="button" disabled={busy} onClick={() => void mutate("unlink", m.deviceVariantId)} style={{ padding: "0.3rem 0.65rem", border: "1px solid #c7d7eb", borderRadius: "0.5rem", background: "#fff", color: "#173b66", fontWeight: 600 }}>{ar ? "إزالة" : "Remove"}</button>
        </li>)}
      </ul>
    </div>}
    {parts.length === 0 && <p>{ar ? "أضف منتجًا من نوع قطعة صيانة أولًا." : "Add a repair part product first."}</p>}
  </section>;
}
