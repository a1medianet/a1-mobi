import { localeDirection, resolveLocale } from "@/core/config/locales";
import { notFound } from "next/navigation";
import Link from "next/link";

const copy = {
  ar: {
    greeting: "صباح الخير، شادي", subtitle: "إليك ملخص حركة المتجر اليوم",
    search: "ابحث عن منتج، عميل أو رقم IMEI", newSale: "عملية بيع جديدة",
    overview: "نظرة عامة", today: "اليوم", sales: "مبيعات اليوم", profit: "صافي الربح",
    repairs: "أجهزة قيد الصيانة", stock: "تنبيهات المخزون", quick: "إجراءات سريعة",
    activity: "آخر العمليات", viewAll: "عرض الكل", trust: "فحص جهاز", inventory: "إضافة مخزون",
    repair: "استلام صيانة", topup: "شحن رصيد", nav: ["الرئيسية","نقطة البيع","المخزون والأجهزة","الصيانة","العملاء والديون","الصندوق","التعبئة","فحص IMEI","التقارير"],
    columns: ["العملية","العميل","الوقت","المبلغ","الحالة"], branch: "فرع القبة", online: "النظام متصل",
  },
  en: {
    greeting: "Good morning, Chadi", subtitle: "Here is today’s store activity",
    search: "Search product, customer, or IMEI", newSale: "New sale",
    overview: "Overview", today: "Today", sales: "Today’s sales", profit: "Net profit",
    repairs: "Devices in repair", stock: "Stock alerts", quick: "Quick actions",
    activity: "Recent activity", viewAll: "View all", trust: "Device check", inventory: "Add stock",
    repair: "Repair intake", topup: "Top-up", nav: ["Dashboard","Point of sale","Inventory & devices","Repairs","Customers & debt","Cash","Top-up","IMEI check","Reports"],
    columns: ["Transaction","Customer","Time","Amount","Status"], branch: "Al-Qobbeh branch", online: "System online",
  },
};

const icons = ["⌂","▣","◇","⌁","♙","▤","↗","⌕","▥"];
const navHrefs = ["/ar", "/ar/pos", "/ar/inventory", "/ar/repairs", "/ar/customers", "/ar/cash", "/ar/topup", "/ar/device-trust", "/ar/reports"];
const metrics = [
  { key: "sales", value: "$1,284.50", delta: "+12.5%", tone: "blue", icon: "↗" },
  { key: "profit", value: "$342.80", delta: "+8.2%", tone: "green", icon: "⌁" },
  { key: "repairs", value: "18", delta: "5 جاهزة", tone: "amber", icon: "◇" },
  { key: "stock", value: "7", delta: "تحتاج متابعة", tone: "rose", icon: "!" },
];
const rows = [
  ["#INV-2841","محمد أحمد","10:42","$485.00","مكتملة"],
  ["#REP-0928","سارة خالد","10:18","$75.00","قيد الصيانة"],
  ["#INV-2840","عميل نقدي","09:51","$214.50","مكتملة"],
  ["#TOP-1184","كريم حسن","09:34","$20.00","مكتملة"],
];

export default async function Dashboard({ params }: { params: Promise<{ locale: string }> }) {
  const raw = (await params).locale;
  if (raw !== "ar" && raw !== "en") notFound();
  const locale = resolveLocale(raw);
  const ar = locale === "ar";
  const t = copy[locale];
  return (
    <div dir={localeDirection[locale]} className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">A1</span><span><b>Mobi</b><small>Store OS</small></span></div>
        <nav className="nav-list">
          {t.nav.map((item, i) => <Link className={i === 0 ? "nav-item active" : "nav-item"} href={navHrefs[i].replace("/ar", `/${locale}`)} key={item}><span className="nav-icon">{icons[i]}</span><span>{item}</span>{i === 3 && <em>18</em>}</Link>)}
        </nav>
        <div className="sidebar-foot">
          <div className="status-dot" /><div><b>{t.online}</b><small>آخر مزامنة الآن</small></div>
        </div>
      </aside>      <main className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">A1</span><b>Mobi</b></div>
          <label className="search"><span>⌕</span><input aria-label={t.search} placeholder={t.search}/><kbd>F2</kbd></label>
          <div className="top-actions">
            <Link className="locale" href={ar ? "/en" : "/ar"}>{ar ? "EN" : "AR"}</Link>
            <button className="icon-btn" aria-label="Notifications">♢<i /></button>
            <div className="profile"><span className="avatar">ش</span><span><b>شادي عطوي</b><small>{t.branch}</small></span><span>⌄</span></div>
          </div>
        </header>
        <div className="content">
          <section className="welcome">
            <div><p className="eyebrow">{t.branch} · الأحد، 28 سبتمبر</p><h1>{t.greeting}</h1><p>{t.subtitle}</p></div>
            <button className="primary"><span>＋</span>{t.newSale}<kbd>F4</kbd></button>
          </section>
          <section className="section-head"><div><h2>{t.overview}</h2><p>{t.today}</p></div><button className="period">{t.today}<span>⌄</span></button></section>
          <section className="metrics">
            {metrics.map((m) => <article className="metric" key={m.key}><div className={"metric-icon "+m.tone}>{m.icon}</div><div className="metric-body"><p>{t[m.key as keyof typeof t]}</p><strong>{m.value}</strong><small className={m.tone}>{m.delta}</small></div></article>)}
          </section>
          <section className="quick-card">
            <div className="section-head"><div><h2>{t.quick}</h2><p>الوصول السريع لأكثر العمليات استخدامًا</p></div></div>
            <div className="quick-grid">
              {[[t.newSale,"▣","blue"],[t.trust,"⌕","violet"],[t.repair,"◇","amber"],[t.inventory,"□","green"],[t.topup,"↗","cyan"]].map(([label,icon,tone]) => <button className="quick-action" key={label}><span className={"quick-icon "+tone}>{icon}</span><b>{label}</b><small>ابدأ الآن <span>←</span></small></button>)}
            </div>
          </section>          <section className="activity-card">
            <div className="section-head"><div><h2>{t.activity}</h2><p>آخر حركات المتجر المسجلة</p></div><button className="text-btn">{t.viewAll} ←</button></div>
            <div className="table-wrap"><table><thead><tr>{t.columns.map(c=><th key={c}>{c}</th>)}</tr></thead>
              <tbody>{rows.map((row,ri)=><tr key={row[0]}>{row.map((cell,ci)=><td key={ci}>{ci===0?<b className="invoice">{cell}</b>:ci===4?<span className={"pill "+(ri===1?"pending":"done")}>{cell}</span>:cell}</td>)}</tr>)}</tbody>
            </table></div>
          </section>
          <footer><span>A1 Mobi · Multi-Surface Store Platform</span><span>Web · Desktop · Mobile Ready</span></footer>
        </div>
        <nav className="mobile-nav">{t.nav.slice(0,5).map((item,i)=><a className={i===0?"active":""} href="#" key={item}><span>{icons[i]}</span><small>{item}</small></a>)}</nav>
      </main>
    </div>
  );
}
