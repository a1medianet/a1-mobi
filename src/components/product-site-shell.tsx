import Link from "next/link";
import Image from "next/image";
import { ProductLanguageSwitch } from "@/components/product-language-switch";

function MobiWordmark({footer=false}:{footer?:boolean}) {
  return <span className={"mobi-brand-asset"+(footer?" footer-brand-asset":"")} dir="ltr">
    <Image src={footer?"/brand/a1-mobi-logo-white.svg":"/brand/a1-mobi-logo.svg"} alt="A1 Mobi" width={190} height={62} priority={!footer} unoptimized />
  </span>;
}

export function ProductSiteShell({locale,children}:{locale:"ar"|"en";children:React.ReactNode}){
  const ar=locale==="ar";
  return <div lang={locale} dir={ar?"rtl":"ltr"} className="product-site">
    <header className="product-nav">
      <div className="product-shell nav-inner">
        <Link href={"/product/"+locale} className="product-brand" aria-label="A1 Mobi"><MobiWordmark/></Link>
        <nav className="product-main-links" dir={ar?"rtl":"ltr"} aria-label={ar?"روابط المنتج الرئيسية":"Main product navigation"}>
          <Link href={"/product/"+locale}>{ar?"الرئيسية":"Home"}</Link>
          <Link href={"/product/"+locale+"#features"}>{ar?"المميزات":"Features"}</Link>
          <Link href={"/product/"+locale+"#why"}>{ar?"لماذا A1 Mobi؟":"Why A1 Mobi?"}</Link>
          <Link href={"/product/"+locale+"/pricing"}>{ar?"الأسعار":"Pricing"}</Link>
        </nav>
        <div className="product-nav-actions" dir="ltr">
          <Link className="product-login" href={"/"+locale+"/login"}>{ar?"تسجيل الدخول":"Sign in"}</Link>
          <Link className="product-cta small" href={"/product/"+locale+"/signup"}>{ar?"ابدأ الآن":"Get started"}</Link>
          <ProductLanguageSwitch locale={locale}/>
        </div>
        <details className="product-mobile-menu" dir={ar?"rtl":"ltr"}>
          <summary>{ar?"القائمة":"Menu"} <span aria-hidden="true">☰</span></summary>
          <div className="product-mobile-menu-items">
            <Link href={"/product/"+locale}>{ar?"الرئيسية":"Home"}</Link>
            <Link href={"/product/"+locale+"#features"}>{ar?"المميزات":"Features"}</Link>
            <Link href={"/product/"+locale+"#why"}>{ar?"لماذا A1 Mobi؟":"Why A1 Mobi?"}</Link>
            <Link href={"/product/"+locale+"/pricing"}>{ar?"الأسعار":"Pricing"}</Link>
            <Link href={"/"+locale+"/login"}>{ar?"تسجيل الدخول":"Sign in"}</Link>
            <Link href={"/product/"+locale+"/signup"}>{ar?"ابدأ الآن":"Get started"}</Link>
          </div>
        </details>
      </div>
    </header>
    {children}
    <footer className="product-footer">
      <div className="product-shell footer-grid">
        <div><div className="product-brand footer-brand"><MobiWordmark footer/></div><p>{ar?"نظام تشغيل متكامل لمتاجر وصيانة الهواتف.":"Operating system for mobile retail and repair."}</p></div>
        <div><b>{ar?"المنتج":"Product"}</b><Link href={"/product/"+locale}>{ar?"نظرة عامة":"Overview"}</Link><Link href={"/product/"+locale+"/demo"}>{ar?"تجربة مباشرة":"Live demo"}</Link><Link href={"/product/"+locale+"/pricing"}>{ar?"الخطط":"Plans"}</Link></div>
        <div><b>{ar?"الدعم والثقة":"Support & trust"}</b><Link href={"/product/"+locale+"/help"}>{ar?"دليل الاستخدام":"Help Center"}</Link><Link href={"/product/"+locale+"/security"}>{ar?"الأمان والثقة":"Security & Trust"}</Link><Link href={"/product/"+locale+"/privacy"}>{ar?"الخصوصية":"Privacy"}</Link><Link href={"/product/"+locale+"/terms"}>{ar?"شروط التجربة":"Pilot Terms"}</Link><Link href={"/product/"+locale+"/status"}>{ar?"حالة المنتج":"Product Status"}</Link><span>hi@a1medianet.com</span></div>
      </div>
    </footer>
  </div>;
}
