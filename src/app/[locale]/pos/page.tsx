"use client";
import { useState } from "react";
import Link from "next/link";

const products = [
  { name:"Samsung Galaxy A56", sku:"SM-A566/256", price:349, stock:4, serial:true },
  { name:"iPhone 15 Pro", sku:"APL-IP15P", price:799, stock:2, serial:true },
  { name:"USB-C Fast Charger", sku:"ACC-USBC-25", price:18, stock:12, serial:false },
  { name:"Screen Protector", sku:"ACC-SP-01", price:6, stock:24, serial:false },
];

export default function PosPage() {
  const [query,setQuery]=useState("");
  const [cart,setCart]=useState<typeof products>([]);
  const filtered=products.filter(p=>p.name.toLowerCase().includes(query.toLowerCase())||p.sku.toLowerCase().includes(query.toLowerCase()));
  const total=cart.reduce((sum,p)=>sum+p.price,0);
  return <main dir="rtl" className="pos-page">
    <header className="module-header"><div><Link href="/ar" className="back-link">← لوحة التحكم</Link><p className="module-kicker">A1 MOBI · SELL</p><h1>نقطة البيع</h1><p className="module-sub">بيع سريع مع فحص الجهاز قبل إتمام العملية</p></div><div className="module-actions"><button className="soft-btn">⌘ تعليق العملية</button><button className="primary">＋ عملية جديدة</button></div></header>
    <div className="pos-grid">
      <section className="product-panel"><div className="module-toolbar"><label className="module-search">⌕<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث بالاسم أو SKU أو امسح الباركود"/></label><span className="result-count">{filtered.length} منتجات</span></div><div className="product-grid">
        {filtered.map(product=><button className="product-card" key={product.sku} onClick={()=>setCart(current=>current.some(p=>p.sku===product.sku)?current:[...current,product])}><span className="product-symbol">{product.serial?"◈":"□"}</span><b>{product.name}</b><small>{product.sku}</small><strong>${product.price.toFixed(2)}</strong><em>{product.stock} متوفر</em></button>)}
      </div></section>
      <aside className="cart-panel"><div className="cart-head"><div><h2>الفاتورة الحالية</h2><small>#INV-2842 · نقدي</small></div><span className="cart-badge">{cart.length}</span></div>
        <div className="cart-lines">{cart.length===0?<div className="empty-cart"><span>▣</span><b>السلة فارغة</b><small>اختر منتجًا لإضافته إلى الفاتورة</small></div>:cart.map(item=><div className="cart-line" key={item.sku}><span className="line-icon">{item.serial?"◈":"□"}</span><div><b>{item.name}</b><small>{item.sku}</small></div><strong>${item.price.toFixed(2)}</strong></div>)}</div>
        <div className="cart-summary"><div><span>المجموع الفرعي</span><b>${total.toFixed(2)}</b></div><div><span>الخصم</span><b>$0.00</b></div><div className="cart-total"><span>الإجمالي</span><strong>${total.toFixed(2)}</strong></div><button className="checkout-btn" disabled={!cart.length}>متابعة الدفع <span>←</span></button><small className="trust-note">◉ الأجهزة التسلسلية تتطلب فحص IMEI قبل الإكمال</small></div>
      </aside>
    </div>
  </main>;
}
