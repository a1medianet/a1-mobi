import Link from "next/link";
import {demoProducts,demoStore} from "@/demo/data";

const photos={
 shop:"https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1600&q=80",
 repair:"https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=700&q=80"
};
export default function CustomerStorePreview(){
 const products=demoProducts.filter(p=>p.type==="DEVICE").slice(0,4);
 return <main className="mobi-store" dir="rtl">
  <header className="mobi-store-header"><div className="mobi-shop-brand"><span className="mobi-shop-logo">M<span>•</span></span><div><strong>Mobi Line</strong><small>هواتف · إكسسوارات · صيانة</small></div></div>
   <nav aria-label="التنقل الرئيسي"><a href="#products">المنتجات</a><a href="#services">الصيانة</a><a href="#visit">زيارة المتجر</a></nav>
   <div className="mobi-store-header-actions"><span className="mobi-store-demo-tag">موقع متجر تجريبي</span><Link href="/product/ar">A1 Mobi ↗</Link></div>
  </header>
  <section className="mobi-store-hero">
   <div className="mobi-store-photo"><img src={photos.shop} alt="مساحة متجر هواتف — صورة توضيحية" /></div>
   <div className="mobi-store-hero-copy"><span className="mobi-store-kicker">مرحبًا بك في Mobi Line</span><h1>أحدث الهواتف.<br/><em>وخدمة تثق بها.</em></h1>
   <p>اختر جهازك القادم، واستكشف الإكسسوارات وخدمات الصيانة من مكان واحد.</p>
   <div className="mobi-store-buttons"><a href="#products" className="mobi-store-btn mobi-store-btn-primary">اكتشف المنتجات ←</a><a href="#services" className="mobi-store-btn mobi-store-btn-secondary">خدمات الصيانة</a></div>
   <span className="mobi-store-caption">متجر تجريبي ضمن منصة A1 Mobi · البيانات والأسعار للعرض فقط</span></div>
  </section>
  <section className="mobi-store-info" id="visit" aria-label="معلومات المتجر">
   <div><b>⌖ الموقع</b><span>{demoStore.branchAr}</span></div>
   <div><b>◷ ساعات العمل</b><span>تُحدّد من إعدادات المتجر</span></div>
   <div id="services"><b>✦ صيانة الأجهزة</b><span>استلام · تشخيص · متابعة · تسليم</span></div>
   <div><b>◉ تواصل معنا</b><span>تُضاف بيانات التواصل من إدارة المتجر</span></div>
  </section>
  <section className="mobi-store-featured" id="products">
   <div className="mobi-store-section-head"><div><span className="mobi-store-kicker">اختيارات المتجر</span><h2>هواتف مميزة</h2></div><Link href="/product/ar/demo">استكشف تجربة Mobi الكاملة ↗</Link></div>
   <div className="mobi-store-products">{products.map(p=><article key={p.id} className="mobi-store-product">
    <div className="mobi-store-product-photo">{p.imageUrl?<img src={p.imageUrl} alt={p.nameAr} loading="lazy"/>:<span>📱</span>}</div>
    <div className="mobi-store-product-body"><small>{p.brand}</small><h3>{p.nameAr}</h3><div><strong dir="ltr">${p.price.toLocaleString("en-US")}</strong><Link href="/product/ar/demo" aria-label={"تفاصيل "+p.nameAr}>←</Link></div></div>
   </article>)}</div>
  </section>
  <footer className="mobi-store-bottom"><span>✓ أجهزة مختارة</span><span>✓ صيانة منظمة</span><span>✓ متابعة الطلبات</span><span className="mobi-store-powered">Powered by A1 Mobi</span></footer>
 </main>
}
