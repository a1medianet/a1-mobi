import Link from "next/link";

export function ProductSiteShell({locale,children}:{locale:"ar"|"en";children:React.ReactNode}){
  const ar=locale==="ar";
  const other=ar?"en":"ar";
  return <div lang={locale} dir={ar?"rtl":"ltr"} className="product-site">
    <header className="product-nav">
      <div className="product-shell nav-inner">
        <Link href={"/product/"+locale} className="product-brand"><span>A1</span><b>Mobi</b></Link>
        <nav>
          <Link href={"/product/"+locale+"#features"}>{ar?"المزايا":"Features"}</Link>
          <Link href={"/product/"+locale+"/demo"}>{ar?"التجربة":"Demo"}</Link>
          <Link href={"/product/"+locale+"/pricing"}>{ar?"الخطط":"Plans"}</Link>
          <Link href={"/product/"+other} hrefLang={other}>{ar?"EN":"العربية"}</Link>
          <Link className="product-login" href={"/"+locale+"/login"}>{ar?"تسجيل الدخول":"Sign in"}</Link>
          <Link className="product-cta small" href={"/product/"+locale+"/signup"}>{ar?"ابدأ التجربة":"Start trial"}</Link>
        </nav>
      </div>
    </header>
    {children}
    <footer className="product-footer">
      <div className="product-shell footer-grid">
        <div><div className="product-brand footer-brand"><span>A1</span><b>Mobi</b></div><p>{ar?"نظام تشغيل متكامل لمتاجر وصيانة الهواتف.":"Operating system for mobile retail and repair."}</p></div>
        <div><b>{ar?"المنتج":"Product"}</b><Link href={"/product/"+locale}>{ar?"نظرة عامة":"Overview"}</Link><Link href={"/product/"+locale+"/demo"}>{ar?"تجربة مباشرة":"Live demo"}</Link><Link href={"/product/"+locale+"/pricing"}>{ar?"الخطط":"Plans"}</Link></div>
        <div><b>{ar?"الدعم والثقة":"Support & trust"}</b><Link href={"/product/"+locale+"/help"}>{ar?"دليل الاستخدام":"Help Center"}</Link><Link href={"/product/"+locale+"/security"}>{ar?"الأمان والثقة":"Security & Trust"}</Link><Link href={"/product/"+locale+"/privacy"}>{ar?"الخصوصية":"Privacy"}</Link><Link href={"/product/"+locale+"/terms"}>{ar?"شروط التجربة":"Pilot Terms"}</Link><Link href={"/product/"+locale+"/status"}>{ar?"حالة المنتج":"Product Status"}</Link><span>hi@a1medianet.com</span></div>
      </div>
    </footer>
  </div>;
}
