"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const labels = {
  ar: ["الرئيسية","نقطة البيع","المنتجات","المخزون والأجهزة","الصيانة","العملاء والديون","طلبات المتجر","الصندوق","التعبئة","فحص IMEI","التقارير","الإدارة","الفريق والصلاحيات","الحساب والاشتراك"],
  en: ["Dashboard","Point of sale","Products","Inventory & devices","Repairs","Customers & debt","Store orders","Cash","Top-up","IMEI check","Reports","Admin","Team & access","Account & subscription"],
};
const paths = ["","/pos","/products","/inventory","/repairs","/customers","/orders","/cash","/topup","/device-trust","/reports","/admin","/settings/team","/account"];
const icons = ["⌂","▣","▦","◇","⌁","♙","▣","▤","↗","⌕","▥","⚙","♜","◎"];

export function AppShell({ locale, children }: {
  locale: "ar" | "en";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const mobileNav = useRef<HTMLElement>(null);
  const [sidebarCollapsed,setSidebarCollapsed] = useState(false);

  useEffect(() => {
    mobileNav.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block:"nearest", inline:"center" });
  },[pathname]);

  const ar = locale === "ar";
  const other = ar ? "en" : "ar";
  const otherPath = pathname.replace(/^\/(ar|en)(?=\/|$)/,"/"+other);
  const activeIndex = paths.findIndex(path => pathname === "/"+locale+path);

  const navigation = (mobile: boolean) => {
    const indexes = mobile ? [0,1,2,4,6,13] : labels[locale].map((_,index)=>index);
    return indexes.map(index => {
      const label = labels[locale][index];
      const active = index === activeIndex;
      return <Link key={paths[index]} href={"/"+locale+paths[index]}
        className={mobile ? (active ? "active" : "") : "nav-item"+(active ? " active" : "")}
        aria-current={active ? "page" : undefined} aria-label={label} title={label}>
        <span className={mobile ? undefined : "nav-icon"} aria-hidden="true">{icons[index]}</span>
        {mobile ? <small>{label}</small> : <span>{label}</span>}
      </Link>;
    });
  };

  return <div lang={locale} dir={ar ? "rtl" : "ltr"} className={"app-shell"+(sidebarCollapsed?" sidebar-collapsed":"")}>
    <a className="skip-link" href="#main-content">{ar ? "انتقل إلى المحتوى" : "Skip to content"}</a>

    <aside className="sidebar">
      <div className="brand-row">
        <Link href={"/"+locale} className="brand" aria-label="A1 Mobi">
          <Image src="/brand/a1-mobi-logo-white.svg" alt="" className="a1-mobi-sidebar-logo" width={170} height={55} unoptimized priority />
          <Image src="/brand/a1-mobi-icon-white.svg" alt="" className="a1-mobi-sidebar-icon" width={42} height={42} unoptimized />
        </Link>
        <button className="sidebar-toggle" type="button"
          aria-label={sidebarCollapsed ? (ar?"توسيع القائمة":"Expand sidebar") : (ar?"طي القائمة":"Collapse sidebar")}
          aria-pressed={sidebarCollapsed}
          onClick={()=>setSidebarCollapsed(value=>!value)}>
          <span aria-hidden="true">{sidebarCollapsed ? "»" : "«"}</span>
        </button>
      </div>
      <nav className="nav-list" aria-label={ar ? "أقسام المتجر" : "Store workspaces"}>{navigation(false)}</nav>
      <div className="sidebar-foot">
        <div className="status-dot pilot" aria-hidden="true" />
        <div><b>{ar ? "بيئة تدريب" : "Practice workspace"}</b>
          <small>{ar ? "أمثلة للتدريب فقط · ليست مبيعات حقيقية" : "Samples only · not real sales"}</small></div>
      </div>
    </aside>

    <div className="workspace">
      <header className="topbar">
        <Link href={"/"+locale} className="mobile-brand" aria-label="A1 Mobi">
          <Image src="/brand/a1-mobi-icon.svg" alt="" className="a1-mobi-brand-icon" width={33} height={33} unoptimized />
        </Link>
        <span className="workspace-title">{labels[locale][activeIndex] ?? "A1 Mobi"}</span>
        <select className="mobile-workspaces" aria-label={ar ? "انتقل إلى قسم" : "Go to workspace"}
          value={activeIndex >= 0 ? "/"+locale+paths[activeIndex] : ""}
          onChange={event=>router.push(event.target.value)}>
          {activeIndex < 0 && <option value="" disabled>A1 Mobi</option>}
          {labels[locale].map((label,index)=><option key={paths[index]} value={"/"+locale+paths[index]}>{label}</option>)}
        </select>
        <div className="top-actions">
          <Link className="locale account-link" href={"/"+locale+"/account"}>{ar ? "الحساب" : "Account"}</Link>
          <Link className="locale" href={"/product/"+locale} title={ar?"صفحة المنتج":"Product site"}>{ar?"الموقع":"Site"}</Link>
          <span className="environment-label pilot-label">{ar?"بيئة تجربة":"Demo mode"}</span>
          <Link className="locale" href={otherPath} hrefLang={other}
            aria-label={ar ? "Switch to English" : "التبديل إلى العربية"}>{ar ? "EN" : "العربية"}</Link>
        </div>
      </header>

      <div id="main-content" tabIndex={-1}>{children}</div>
      <nav ref={mobileNav} className="mobile-nav" aria-label={ar ? "أقسام المتجر" : "Store workspaces"}>{navigation(true)}</nav>
    </div>
  </div>;
}
