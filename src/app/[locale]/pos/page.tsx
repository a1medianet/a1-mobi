"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { demoProducts, demoStore, type DemoProduct } from "@/demo/data";

type CartLine = { product: DemoProduct; quantity: number };
type DemoReceipt = {
  number: string;
  customer: string;
  totalUsd: number;
  currency: "USD" | "LBP";
  paidAmount: number;
  items: number;
};

const copy = {
  ar: {
    back:"لوحة التحكم", title:"نقطة البيع", subtitle:"تجربة بيع كاملة محليًا بمنتجات ومخزون وأسعار تجريبية واقعية",
    preview:"Pilot Demo — الإكمال هنا يحفظ إيصالًا تجريبيًا في هذا المتصفح فقط ولا ينشئ قيدًا محاسبيًا أو حركة مخزون إنتاجية.",
    suspend:"تعليق السلة", resume:"استعادة السلة", fresh:"سلة جديدة",
    search:"ابحث بالمنتج أو SKU أو الباركود", products:"منتجات", available:"متوفر", add:"أضف",
    cart:"السلة الحالية", pilot:"Pilot Demo", empty:"السلة فارغة", choose:"اختر منتجًا للبدء", noResults:"لا توجد منتجات مطابقة",
    subtotal:"المجموع", total:"الإجمالي", remove:"احذف", quantity:"الكمية", more:"زيادة", less:"تقليل",
    customer:"العميل", walkin:"عميل نقدي", rami:"رامي درويش", lina:"لينا مصطفى",
    currency:"عملة الدفع", usd:"USD", lbp:"LBP", rate:"سعر صرف تجريبي",
    complete:"إكمال البيع التجريبي", completing:"جارٍ الإكمال…",
    serialized:"يتطلب IMEI/Serial في الربط التشغيلي", receipt:"تم إنشاء إيصال تجريبي", receiptNo:"رقم الإيصال",
    paid:"المدفوع", items:"العناصر", another:"عملية جديدة", local:"محفوظ محليًا على هذا المتصفح",
    stockChanged:"تم تحديث مخزون التجربة لهذه الجلسة.",
  },
  en: {
    back:"Dashboard", title:"Point of sale", subtitle:"Complete a local pilot sale using realistic demo products, stock, and prices",
    preview:"Pilot Demo — completion stores a demo receipt in this browser only; it does not create production accounting or inventory movements.",
    suspend:"Suspend cart", resume:"Resume cart", fresh:"New cart",
    search:"Search product, SKU, or barcode", products:"products", available:"available", add:"Add",
    cart:"Current cart", pilot:"Pilot Demo", empty:"Cart is empty", choose:"Choose a product to begin", noResults:"No matching products",
    subtotal:"Subtotal", total:"Total", remove:"Remove", quantity:"Quantity", more:"Increase", less:"Decrease",
    customer:"Customer", walkin:"Walk-in customer", rami:"Rami Darwish", lina:"Lina Mustafa",
    currency:"Payment currency", usd:"USD", lbp:"LBP", rate:"Demo exchange rate",
    complete:"Complete demo sale", completing:"Completing…",
    serialized:"IMEI/Serial required when operational wiring is enabled", receipt:"Demo receipt created", receiptNo:"Receipt",
    paid:"Paid", items:"Items", another:"New sale", local:"Stored locally in this browser", stockChanged:"Pilot stock updated for this session.",
  },
} as const;

const customerOptions = {
  ar:["عميل نقدي","رامي درويش","لينا مصطفى"],
  en:["Walk-in customer","Rami Darwish","Lina Mustafa"],
};

export default function PosPage() {
  const { locale: raw } = useParams<{ locale: string }>();
  const locale = raw === "en" ? "en" : "ar";
  const t = copy[locale];
  const [query,setQuery] = useState("");
  const [cart,setCart] = useState<CartLine[]>([]);
  const [suspended,setSuspended] = useState<CartLine[] | null>(null);
  const [customerIndex,setCustomerIndex] = useState(0);
  const customer = customerOptions[locale][customerIndex] ?? customerOptions[locale][0];
  const [currency,setCurrency] = useState<"USD" | "LBP">("USD");
  const [receipt,setReceipt] = useState<DemoReceipt | null>(null);
  const [stock,setStock] = useState<Record<string,number>>(() =>
    Object.fromEntries(demoProducts.map(product => [product.id,product.stock])));
  const [busy,setBusy] = useState(false);
  const [receiptSequence,setReceiptSequence] = useState(3109);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return demoProducts.filter(product => !q || [
      product.nameAr,product.nameEn,product.sku,product.barcode,product.brand,
    ].some(value => value.toLowerCase().includes(q)));
  },[query]);

  const total = cart.reduce((sum,line) => sum + line.product.price * line.quantity,0);
  const itemCount = cart.reduce((sum,line) => sum + line.quantity,0);
  const paidAmount = currency === "USD" ? total : Math.round(total * demoStore.lbpRate / 1000) * 1000;

  const available = (product: DemoProduct) => stock[product.id] ?? product.stock;
  const limit = (product: DemoProduct) => product.serialized ? Math.min(1,available(product)) : available(product);

  function changeQuantity(id: string,delta: number) {
    setCart(current => current
      .map(line => line.product.id === id
        ? {...line,quantity:Math.min(limit(line.product),line.quantity+delta)}
        : line)
      .filter(line => line.quantity > 0));
  }

  function addProduct(product: DemoProduct) {
    if (available(product) <= 0) return;
    setReceipt(null);
    setCart(current => current.some(line => line.product.id === product.id)
      ? current.map(line => line.product.id === product.id
        ? {...line,quantity:Math.min(limit(product),line.quantity+1)}
        : line)
      : [...current,{product,quantity:1}]);
  }

  function toggleSuspend() {
    if (suspended && cart.length === 0) {
      setCart(suspended);
      setSuspended(null);
    } else if (!suspended && cart.length > 0) {
      setSuspended(cart);
      setCart([]);
    }
  }

  function resetSale() {
    setCart([]);
    setReceipt(null);
    setCustomerIndex(0);
    setCurrency("USD");
  }

  function completeSale() {
    if (!cart.length || busy) return;
    setBusy(true);
    const number = "DM-" + receiptSequence.toString().padStart(6,"0");
    const nextStock = {...stock};
    for (const line of cart) nextStock[line.product.id] = Math.max(0,available(line.product)-line.quantity);
    const demoReceipt: DemoReceipt = {
      number,
      customer,
      totalUsd:total,
      currency,
      paidAmount,
      items:itemCount,
    };
    try {
      const prior = JSON.parse(localStorage.getItem("a1-mobi-pilot-sales") || "[]") as DemoReceipt[];
      localStorage.setItem("a1-mobi-pilot-sales",JSON.stringify([demoReceipt,...prior].slice(0,20)));
    } catch {
      // Local persistence is best-effort in demo mode.
    }
    setStock(nextStock);
    setReceiptSequence(current=>current+1);
    setReceipt(demoReceipt);
    setCart([]);
    setBusy(false);
  }

  const canSuspend = (cart.length > 0 && !suspended) || (cart.length === 0 && !!suspended);

  return <main lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className="pos-page pilot-pos">
    <header className="module-header">
      <div>
        <Link href={"/"+locale} className="back-link">{t.back}</Link>
        <p className="module-kicker">A1 MOBI · SELL · {t.pilot}</p>
        <h1>{t.title}</h1><p className="module-sub">{t.subtitle}</p>
      </div>
      <div className="module-actions">
        <button className="soft-btn" onClick={toggleSuspend} disabled={!canSuspend}>{suspended?t.resume:t.suspend}</button>
        <button className="primary" onClick={resetSale} disabled={!cart.length && !receipt}>{t.fresh}</button>
      </div>
    </header>

    <p className="preview-notice" role="status">{t.preview}</p>

    {receipt && <section className="demo-receipt" role="status">
      <div className="receipt-check">✓</div>
      <div><small>{t.receipt}</small><h2><bdi dir="ltr">{receipt.number}</bdi></h2>
        <p>{receipt.customer} · {receipt.items} {t.items}</p></div>
      <div className="receipt-total"><small>{t.paid}</small>
        <strong><bdi dir="ltr">{receipt.currency==="USD"?"$"+receipt.paidAmount.toFixed(2):receipt.paidAmount.toLocaleString()+" LBP"}</bdi></strong>
        <span>{t.local}</span></div>
      <button className="soft-btn" onClick={resetSale}>{t.another}</button>
    </section>}

    <div className="pos-grid">
      <section className="product-panel" aria-label={t.products}>
        <div className="module-toolbar">
          <label className="module-search"><span aria-hidden="true">⌕</span>
            <input value={query} onChange={event=>setQuery(event.target.value)} aria-label={t.search} placeholder={t.search}/>
          </label>
          <Link className="text-link" href={"/"+locale+"/products"}>{t.products} →</Link>
        </div>
        <div className="product-grid">{filtered.map(product => {
          const remaining = available(product);
          return <button className="product-card" key={product.id} onClick={()=>addProduct(product)} disabled={remaining<=0}>
            <span className="product-symbol" aria-hidden="true">{product.type==="DEVICE"?"◈":product.type==="PART"?"⌁":"□"}</span>
            <small>{product.brand}</small>
            <b>{locale==="ar"?product.nameAr:product.nameEn}</b>
            <small><bdi dir="ltr">{product.sku}</bdi></small>
            <strong><bdi dir="ltr">{"$"+product.price.toFixed(2)}</bdi></strong>
            <em>{remaining} {t.available}</em>
          </button>;
        })}</div>
        {filtered.length===0 && <p className="empty-search">{t.noResults}</p>}
      </section>

      <aside className="cart-panel" aria-label={t.cart}>
        <div className="cart-head"><div><h2>{t.cart}</h2><small>{t.pilot}</small></div>
          <span className="cart-badge" aria-live="polite">{itemCount}</span></div>

        <div className="cart-lines">{cart.length===0
          ? <div className="empty-cart"><span aria-hidden="true">▣</span><b>{t.empty}</b><small>{t.choose}</small></div>
          : cart.map(({product,quantity}) => <div className="cart-line" key={product.id}>
            <span className="line-icon" aria-hidden="true">{product.serialized?"◈":"□"}</span>
            <div><b>{locale==="ar"?product.nameAr:product.nameEn}</b><small><bdi dir="ltr">{product.sku}</bdi></small>
              {product.serialized && <small className="serialized-hint">{t.serialized}</small>}</div>
            <strong><bdi dir="ltr">{"$"+(product.price*quantity).toFixed(2)}</bdi></strong>
            <div className="quantity-controls">
              <button onClick={()=>changeQuantity(product.id,-1)} aria-label={t.less}>−</button>
              <output aria-label={t.quantity}>{quantity}</output>
              <button onClick={()=>changeQuantity(product.id,1)} disabled={quantity>=limit(product)} aria-label={t.more}>＋</button>
              <button onClick={()=>setCart(current=>current.filter(line=>line.product.id!==product.id))} aria-label={t.remove}>×</button>
            </div>
          </div>)}
        </div>

        <div className="pilot-checkout-fields">
          <label>{t.customer}
            <select value={customer} onChange={event=>setCustomer(event.target.value)}>
              {customerOptions[locale].map(option=><option key={option}>{option}</option>)}
            </select>
          </label>
          <label>{t.currency}
            <select value={currency} onChange={event=>setCurrency(event.target.value as "USD"|"LBP")}>
              <option value="USD">{t.usd}</option><option value="LBP">{t.lbp}</option>
            </select>
          </label>
        </div>

        <div className="cart-summary">
          <div><span>{t.subtotal}</span><b><bdi dir="ltr">{"$"+total.toFixed(2)}</bdi></b></div>
          {currency==="LBP" && <div><span>{t.rate}</span><b><bdi dir="ltr">{demoStore.lbpRate.toLocaleString()} LBP/USD</bdi></b></div>}
          <div className="cart-total"><span>{t.total}</span><strong><bdi dir="ltr">
            {currency==="USD"?"$"+total.toFixed(2):paidAmount.toLocaleString()+" LBP"}
          </bdi></strong></div>
          <button className="checkout-btn" onClick={completeSale} disabled={!cart.length||busy}>
            {busy?t.completing:t.complete}
          </button>
          <small className="trust-note">{t.stockChanged}</small>
        </div>
      </aside>
    </div>
  </main>;
}
