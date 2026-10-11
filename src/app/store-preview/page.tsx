import { StorePreviewHeader, StorePreviewProducts } from "@/components/store-preview-controls";
import { DemoScenePhoto, StoreSectionLink } from "@/components/demo-product-photo";
import {demoProducts,demoStore} from "@/demo/data";

const photos={
 shop:"https://images.unsplash.com/photo-1571854000455-d8b5b5b489fc?auto=format&fit=crop&w=1600&q=80"
};
export default function CustomerStorePreview(){
 const products=[...demoProducts.filter(p=>p.type==="DEVICE").slice(0,3),...demoProducts.filter(p=>p.type==="ACCESSORY").slice(0,1)];
 return <main className="mobi-store" lang="ar" dir="rtl">
  <StorePreviewHeader />
  <section className="mobi-store-hero">
   <div className="mobi-store-photo"><DemoScenePhoto src={photos.shop} alt="هواتف معروضة في متجر — صورة توضيحية وليست متجر TechZone" eager /></div>
   <div className="mobi-store-hero-copy"><span className="mobi-store-kicker">مرحبًا بك في TechZone</span><h1>أحدث الهواتف.<br/><em>وخدمة تثق بها.</em></h1>
   <p>اختر جهازك القادم، واستكشف الإكسسوارات وخدمات الصيانة من مكان واحد.</p>
   <div className="mobi-store-buttons"><StoreSectionLink target="products" className="mobi-store-btn mobi-store-btn-primary">اكتشف المنتجات ←</StoreSectionLink><StoreSectionLink target="services" className="mobi-store-btn mobi-store-btn-secondary">خدمات الصيانة</StoreSectionLink></div>
   <span className="mobi-store-caption" id="about-store" tabIndex={-1}>TechZone علامة تجريبية توضيحية · الصور والأسعار لا تمثّل عروض متجر حقيقي</span></div>
  </section>
  <section className="mobi-store-info" id="visit" tabIndex={-1} aria-label="معلومات المتجر">
   <div><b>⌖ الموقع</b><span>{demoStore.branchAr}</span></div>
   <div><b>◷ ساعات العمل</b><span>تُحدّد من إعدادات المتجر</span></div>
   <div id="services" tabIndex={-1} role="region" aria-label="خدمات الصيانة التوضيحية"><b>✦ صيانة الأجهزة</b><span>استلام · تشخيص · متابعة · الحجز غير متاح</span></div>
   <div id="store-contact" tabIndex={-1}><b>◉ تواصل تجريبي</b><span>WhatsApp غير مهيّأ · لا يوجد رقم متجر فعلي</span></div>
  </section>
  <StorePreviewProducts products={products} />
  <footer className="mobi-store-bottom"><span>✓ أجهزة مختارة</span><span>✓ صيانة منظمة</span><span>✓ متابعة الطلبات</span><span className="mobi-store-powered">Powered by A1 Mobi</span></footer>
 </main>
}
