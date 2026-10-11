import Link from "next/link";
import { DemoProductPhoto, DemoScenePhoto, StoreSectionLink } from "@/components/demo-product-photo";
import {demoProducts,demoStore} from "@/demo/data";

const photos={
 shop:"https://images.unsplash.com/photo-1571854000455-d8b5b5b489fc?auto=format&fit=crop&w=1600&q=80"
};
export default function CustomerStorePreview(){
 const products=[...demoProducts.filter(p=>p.type==="DEVICE").slice(0,3),...demoProducts.filter(p=>p.type==="ACCESSORY").slice(0,1)];
 return <main className="mobi-store" lang="ar" dir="rtl">
  <header className="mobi-store-header"><div className="mobi-shop-brand"><span className="mobi-shop-logo">M<span>•</span></span><div><strong><span style={{color:"#1265E8"}}>Tech</span><span style={{color:"#FF7A1A"}}>Zone</span></strong><small>هواتف · إكسسوارات · صيانة</small></div></div>
   <nav aria-label="التنقل الرئيسي"><StoreSectionLink target="products">المنتجات</StoreSectionLink><StoreSectionLink target="services">الصيانة</StoreSectionLink><StoreSectionLink target="visit">زيارة المتجر</StoreSectionLink></nav>
   <div className="mobi-store-header-actions"><span className="mobi-store-demo-tag">متجر افتراضي للعرض</span><Link href="/product/ar">A1 Mobi ↗</Link></div>
  </header>
  <section className="mobi-store-hero">
   <div className="mobi-store-photo"><DemoScenePhoto src={photos.shop} alt="هواتف معروضة في متجر — صورة توضيحية وليست متجر TechZone" eager /></div>
   <div className="mobi-store-hero-copy"><span className="mobi-store-kicker">مرحبًا بك في TechZone</span><h1>أحدث الهواتف.<br/><em>وخدمة تثق بها.</em></h1>
   <p>اختر جهازك القادم، واستكشف الإكسسوارات وخدمات الصيانة من مكان واحد.</p>
   <div className="mobi-store-buttons"><StoreSectionLink target="products" className="mobi-store-btn mobi-store-btn-primary">اكتشف المنتجات ←</StoreSectionLink><StoreSectionLink target="services" className="mobi-store-btn mobi-store-btn-secondary">خدمات الصيانة</StoreSectionLink></div>
   <span className="mobi-store-caption">TechZone علامة تجريبية توضيحية · الصور والأسعار لا تمثّل عروض متجر حقيقي</span></div>
  </section>
  <section className="mobi-store-info" id="visit" tabIndex={-1} aria-label="معلومات المتجر">
   <div><b>⌖ الموقع</b><span>{demoStore.branchAr}</span></div>
   <div><b>◷ ساعات العمل</b><span>تُحدّد من إعدادات المتجر</span></div>
   <div id="services" tabIndex={-1} role="region" aria-label="خدمات الصيانة التوضيحية"><b>✦ صيانة الأجهزة</b><span>استلام · تشخيص · متابعة · تسليم</span></div>
   <div><b>◉ خدمة العملاء</b><span>تُفعّل وسائل التواصل بعد إعداد الحساب</span></div>
  </section>
  <section className="mobi-store-featured" id="products" tabIndex={-1} aria-label="منتجات وأسعار توضيحية">
   <div className="mobi-store-section-head"><div><span className="mobi-store-kicker">اختيارات المتجر</span><h2>هواتف مميزة</h2></div><Link href="/product/ar/demo">استكشف تجربة Mobi الكاملة ↗</Link></div>
   <div className="mobi-store-products">{products.map(p=><article key={p.id} className="mobi-store-product">
    <div className="mobi-store-product-photo"><DemoProductPhoto product={p} locale="ar" compact /></div>
    <div className="mobi-store-product-body"><small>{p.brand}</small><h3>{p.nameAr}</h3><div><strong dir="ltr">${p.price.toLocaleString("en-US")}</strong><Link href="/product/ar/demo" aria-label={"تفاصيل "+p.nameAr}>←</Link></div></div>
   </article>)}</div>
  </section>
  <footer className="mobi-store-bottom"><span>✓ أجهزة مختارة</span><span>✓ صيانة منظمة</span><span>✓ متابعة الطلبات</span><span className="mobi-store-powered">Powered by A1 Mobi</span></footer>
 </main>
}
