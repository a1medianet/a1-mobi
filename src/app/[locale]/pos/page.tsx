"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const products = [
  { en:"Samsung Galaxy A56", ar:"Samsung Galaxy A56", sku:"SM-A566/256", price:349, stock:4, serial:true },
  { en:"iPhone 15 Pro", ar:"iPhone 15 Pro", sku:"APL-IP15P", price:799, stock:2, serial:true },
  { en:"USB-C Fast Charger", ar:"شاحن USB-C سريع", sku:"ACC-USBC-25", price:18, stock:12, serial:false },
  { en:"Screen Protector", ar:"واقي شاشة", sku:"ACC-SP-01", price:6, stock:24, serial:false },
];
type Product = typeof products[number];
type CartLine = { product: Product; quantity: number };
const copy = {
  ar: {
    back:"لوحة التحكم", title:"نقطة البيع", subtitle:"جرّب رحلة السلة قبل ربطها بعمليات المتجر",
    preview:"سلة توضيحية فقط. التغييرات والتعليق مؤقتة وتزول عند مغادرة الصفحة؛ لا تُحفظ مبيعات أو مخزون.",
    suspend:"تعليق السلة التجريبية", resume:"استعادة السلة التجريبية", fresh:"سلة جديدة",
    search:"ابحث بالاسم أو SKU", products:"منتجات", available:"متوفر", add:"أضف",
    cart:"السلة الحالية", sample:"سلة توضيحية · الدفع غير متصل", empty:"السلة فارغة",
    choose:"اختر منتجًا لإضافته إلى السلة", noResults:"لا توجد منتجات مطابقة",
    subtotal:"المجموع الفرعي", discount:"الخصم", total:"الإجمالي", remove:"احذف", quantity:"الكمية",
    more:"زيادة الكمية", less:"تقليل الكمية", blocked:"الدفع غير متاح في المعاينة",
    note:"البيع الفعلي يتطلب هوية وصلاحيات وفحص IMEI شبكيًا للأجهزة التسلسلية قبل الإكمال.",
    oneSuspend:"استعد السلة المعلقة أولًا؛ المعاينة تدعم سلة معلقة واحدة.",
  },
  en: {
    back:"Dashboard", title:"Point of sale", subtitle:"Try the cart journey before connecting store operations",
    preview:"Sample cart only. Changes and suspension are temporary and disappear when leaving this page; no sales or stock are saved.",
    suspend:"Suspend sample cart", resume:"Resume sample cart", fresh:"New cart",
    search:"Search by name or SKU", products:"products", available:"available", add:"Add",
    cart:"Current cart", sample:"Sample cart · payments disconnected", empty:"The cart is empty",
    choose:"Choose a product to add to the cart", noResults:"No matching products",
    subtotal:"Subtotal", discount:"Discount", total:"Total", remove:"Remove", quantity:"Quantity",
    more:"Increase quantity", less:"Decrease quantity", blocked:"Payments unavailable in preview",
    note:"Real sales require identity, permissions, and a network IMEI check for serialized devices before completion.",
    oneSuspend:"Resume the suspended cart first; preview supports one suspended cart.",
  },
};
export default function PosPage() {
  const { locale: raw } = useParams<{ locale: string }>();
  const locale = raw === "en" ? "en" : "ar", t = copy[locale];
  const [query,setQuery] = useState("");
  const [cart,setCart] = useState<CartLine[]>([]);
  const [suspended,setSuspended] = useState<CartLine[] | null>(null);
  const filtered = products.filter(p => [p.ar,p.en,p.sku].some(value =>
    value.toLowerCase().includes(query.trim().toLowerCase())));
  const total = cart.reduce((sum,line) => sum + line.product.price * line.quantity,0);
  const itemCount = cart.reduce((sum,line) => sum + line.quantity,0);
  const limit = (p: Product) => p.serial ? 1 : p.stock;
  const changeQuantity = (sku: string,delta: number) => setCart(current => current
    .map(line => line.product.sku === sku ? {
      ...line, quantity: Math.min(limit(line.product),line.quantity + delta),
    } : line).filter(line => line.quantity > 0));
  function addProduct(product: Product) {
    setCart(current => current.some(line => line.product.sku === product.sku)
      ? current.map(line => line.product.sku === product.sku
        ? { ...line, quantity: Math.min(limit(product),line.quantity + 1) } : line)
      : [...current,{ product, quantity:1 }]);
  }
  function toggleSuspend() {
    if (suspended && cart.length === 0) { setCart(suspended); setSuspended(null); }
    else if (!suspended && cart.length > 0) { setSuspended(cart); setCart([]); }
  }
  const canSuspend = (cart.length > 0 && !suspended) || (cart.length === 0 && !!suspended);
  return <main lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className="pos-page">
    <header className="module-header"><div>
      <Link href={`/${locale}`} className="back-link">{t.back}</Link>
      <p className="module-kicker">A1 MOBI · SELL</p><h1>{t.title}</h1><p className="module-sub">{t.subtitle}</p>
    </div><div className="module-actions">
      <button className="soft-btn" onClick={toggleSuspend} disabled={!canSuspend}
        title={suspended && cart.length > 0 ? t.oneSuspend : undefined}>{suspended ? t.resume : t.suspend}</button>
      <button className="primary" onClick={() => setCart([])} disabled={cart.length === 0}>{t.fresh}</button>
    </div></header>
    <p className="preview-notice" role="status">{t.preview}</p>
    <div className="pos-grid"><section className="product-panel" aria-label={t.products}>
      <div className="module-toolbar"><label className="module-search"><span aria-hidden="true">⌕</span>
        <input value={query} onChange={e => setQuery(e.target.value)} aria-label={t.search} placeholder={t.search} />
      </label><span className="result-count" aria-live="polite">{filtered.length} {t.products}</span></div>
      <div className="product-grid">{filtered.map(product =>
        <button className="product-card" key={product.sku} onClick={() => addProduct(product)}>
          <span className="sr-only">{t.add} </span><span className="product-symbol" aria-hidden="true">{product.serial ? "◈" : "□"}</span>
          <b>{product[locale]}</b><small><bdi dir="ltr">{product.sku}</bdi></small>
          <strong><bdi dir="ltr">${product.price.toFixed(2)}</bdi></strong><em>{product.stock} {t.available}</em>
        </button>)}</div>{filtered.length === 0 && <p className="empty-search">{t.noResults}</p>}
    </section><aside className="cart-panel" aria-label={t.cart}>
      <div className="cart-head"><div><h2>{t.cart}</h2><small>{t.sample}</small></div>
        <span className="cart-badge" aria-live="polite" aria-label={t.quantity}>{itemCount}</span></div>
      <div className="cart-lines">{cart.length === 0
        ? <div className="empty-cart"><span aria-hidden="true">▣</span><b>{t.empty}</b><small>{t.choose}</small></div>
        : cart.map(({product,quantity}) => <div className="cart-line" key={product.sku}>
          <span className="line-icon" aria-hidden="true">{product.serial ? "◈" : "□"}</span>
          <div><b>{product[locale]}</b><small><bdi dir="ltr">{product.sku}</bdi></small></div>
          <strong><bdi dir="ltr">${(product.price * quantity).toFixed(2)}</bdi></strong>
          <div className="quantity-controls">
            <button onClick={() => changeQuantity(product.sku,-1)} aria-label={t.less+" "+product[locale]}>−</button>
            <output aria-label={t.quantity+" "+product[locale]}>{quantity}</output>
            <button onClick={() => changeQuantity(product.sku,1)} disabled={quantity >= limit(product)}
              aria-label={t.more+" "+product[locale]}>＋</button>
            <button onClick={() => setCart(current => current.filter(line => line.product.sku !== product.sku))}
              aria-label={t.remove+" "+product[locale]}>×</button>
          </div>
        </div>)}</div>
      <div className="cart-summary"><div><span>{t.subtotal}</span><b><bdi dir="ltr">${total.toFixed(2)}</bdi></b></div>
        <div><span>{t.discount}</span><b><bdi dir="ltr">$0.00</bdi></b></div>
        <div className="cart-total"><span>{t.total}</span><strong><bdi dir="ltr">${total.toFixed(2)}</bdi></strong></div>
        <button className="checkout-btn" disabled aria-describedby="checkout-note">{t.blocked}</button>
        <small className="trust-note" id="checkout-note">{t.note}</small>
      </div>
    </aside></div>
  </main>;
}
