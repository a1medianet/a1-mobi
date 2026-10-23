"use client";
import { formatNumber } from "@/core/config/number-format";
import { useRef, useState } from "react";
import { addScannedCartProduct, setCartQuantity, type ScanCartLine, type ScanCartProduct } from "@/modules/sell/scan-cart";
import { roundMoney } from "@/modules/sell/pricing";
type Product = ScanCartProduct & { nameAr: string; nameEn: string; price: number };
export function StockPosCart({ products, locations, locale, onSaved }: { products: readonly Product[]; locations: readonly { id: string; name: string }[]; locale: "ar" | "en"; onSaved: () => Promise<void> }) {
  const ar = locale === "ar";
  const [scan, setScan] = useState("");
  const [lines, setLines] = useState<ScanCartLine[]>([]);
  const [locationId, setLocationId] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  // Retain the exact request after an uncertain response, including across draft edits.
  const pending = useRef<{ action: string; locationId: string; lines: ScanCartLine[]; idempotencyKey: string } | null>(null);
  const inFlight = useRef(false);
  function add() {
    try { setLines(addScannedCartProduct(scan, products, lines)); setScan(""); setMessage(""); }
    catch { setMessage(ar ? "رمز غير معروف أو ملتبس؛ استخدم مسار IMEI للأجهزة." : "Unknown or ambiguous code; use IMEI checkout for devices."); }
  }
  async function checkout() {
    if (inFlight.current || !locationId || !lines.length) return;
    inFlight.current = true; setSaving(true); setMessage("");
    setUncertain(true);
    pending.current ??= { action: "sellBulk", locationId, lines, idempotencyKey: crypto.randomUUID() };
    try {
      const response = await fetch("/api/ops/live-01", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending.current) });
      const result = await response.json();
      if (!response.ok) {
        // A rejected transaction can be corrected; uncertain server/network failures keep the request.
        if (response.status < 500 && !["SALE_IDEMPOTENCY_CONFLICT", "RETRY_SAME_REQUEST", "ALREADY_EXISTS"].includes(result.error)) {
          pending.current = null; setUncertain(false);
        }
        throw new Error(result.error || "CHECKOUT_FAILED");
      }
      pending.current = null; setUncertain(false); setLines([]);
      setMessage((ar ? "تم حفظ الفاتورة: " : "Invoice saved: ") + result.invoiceNumber);
      try { await onSaved(); } catch { setMessage(ar ? "تم البيع. حدّث البيانات لعرض الفاتورة." : "Sale saved. Refresh to see the invoice."); }
    } catch { setMessage((ar ? "تعذر تأكيد البيع. تحقق من المخزون والمخزن ثم أعد المحاولة." : "Could not confirm sale. Check stock and location, then retry.")); }
    finally { inFlight.current = false; setSaving(false); }
  }
  const locked = saving || uncertain;
  return <section className="mobi-purchase-scan-preview mobi-pos-stock-cart" aria-label={ar ? "بيع بالباركود" : "Barcode checkout"}>
    <h2>{ar ? "بيع أصناف بالباركود أو SKU" : "Sell items by barcode or SKU"}</h2>
    <p>{ar ? "دفع نقدي بالدولار بالسعر المسجل. يتحقق الخادم من المخزون عند التأكيد." : "Exact USD cash at the registered price. Stock is checked on confirmation."}</p>
    <label>{ar ? "الباركود أو SKU" : "Barcode or SKU"}<input autoComplete="off" value={scan} disabled={locked} onChange={event => setScan(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); add(); } }} /></label>
    <button type="button" disabled={locked || !scan.trim()} onClick={add}>{ar ? "إضافة" : "Add item"}</button>
    <label>{ar ? "المخزن" : "Stock location"}<select value={locationId} disabled={locked} onChange={event => setLocationId(event.target.value)}><option value="">—</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
    <ul className="mobi-pos-stock-lines">{lines.map(line => { const product = products.find(item => item.id === line.productId); return <li key={line.productId}>
      {ar ? product?.nameAr : product?.nameEn} · {product?.sku}
      <label>{ar ? "الكمية" : "Quantity"}<input type="number" min={0} max={10000} step={1} value={line.quantity} disabled={locked} onChange={event => { try { setLines(setCartQuantity(lines, line.productId, Number(event.target.value))); } catch { setMessage(ar ? "كمية غير صالحة" : "Invalid quantity"); } }} /></label>
      <button type="button" disabled={locked} onClick={() => setLines(setCartQuantity(lines, line.productId, 0))}>{ar ? "حذف" : "Remove"}</button>
    </li>; })}</ul>
    <p>{ar ? "الإجمالي USD" : "Total USD"}: {formatNumber(roundMoney(lines.reduce((sum, line) => sum + roundMoney(line.quantity * (products.find(item => item.id === line.productId)?.price ?? 0)), 0)), locale, {minimumFractionDigits:2,maximumFractionDigits:2})}</p>
    {message && <p role="status">{message}</p>}
    <button type="button" className="primary" disabled={saving || !locationId || !lines.length} onClick={() => void checkout()}>{saving ? (ar ? "جار الحفظ" : "Saving…") : (ar ? "تأكيد البيع النقدي / إعادة المحاولة" : "Confirm cash sale / retry")}</button>
  </section>;
}
