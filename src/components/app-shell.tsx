"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const labels = {
  ar: ["الرئيسية","نقطة البيع","المخزون والأجهزة","الصيانة","العملاء والديون","الصندوق","التعبئة","فحص IMEI","التقارير"],
  en: ["Dashboard","Point of sale","Inventory & devices","Repairs","Customers & debt","Cash","Top-up","IMEI check","Reports"],
};
const paths = ["","/pos","/inventory","/repairs","/customers","/cash","/topup","/device-trust","/reports"];
const icons = ["⌂","▣","◇","⌁","♙","▤","↗","⌕","▥"];

export function AppShell({ locale, children }: {
  locale: "ar" | "en"; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const mobileNav = useRef<HTMLElement>(null);
  useEffect(() => {
    mobileNav.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);
  const ar = locale === "ar";
  const other = ar ? "en" : "ar";
  const otherPath = pathname.replace(/^\/(ar|en)(?=\/|$)/, "/" + other);
  const activeIndex = paths.findIndex(path => pathname === "/" + locale + path);
  const navigation = (mobile: boolean) => labels[locale].map((label, index) => {
    const active = index === activeIndex;
    return <Link key={paths[index]} href={"/" + locale + paths[index]}
      className={mobile ? (active ? "active" : "") : "nav-item" + (active ? " active" : "")}
      aria-current={active ? "page" : undefined} aria-label={label} title={label}>
      <span className={mobile ? undefined : "nav-icon"} aria-hidden="true">{icons[index]}</span>
      {mobile ? <small>{label}</small> : <span>{label}</span>}
    </Link>;
  });
  return <div lang={locale} dir={ar ? "rtl" : "ltr"} className="app-shell">
    <a className="skip-link" href="#main-content">{ar ? "انتقل إلى المحتوى" : "Skip to content"}</a>
    <aside className="sidebar">
      <Link href={"/" + locale} className="brand" aria-label="A1 Mobi">
        <span className="brand-mark" aria-hidden="true">A1</span>
        <span><b>Mobi</b><small>{ar ? "منصة المتجر" : "Store platform"}</small></span>
      </Link>
      <nav className="nav-list" aria-label={ar ? "أقسام المتجر" : "Store workspaces"}>{navigation(false)}</nav>
      <div className="sidebar-foot"><div className="status-dot" aria-hidden="true" />
        <div><b>{ar ? "بيئة المعاينة" : "Preview environment"}</b>
          <small>{ar ? "بيانات توضيحية · لا تحفظ عمليات" : "Sample data · no transactions saved"}</small></div>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <Link href={"/" + locale} className="mobile-brand" aria-label="A1 Mobi">
          <span className="brand-mark" aria-hidden="true">A1</span><b>Mobi</b>
        </Link>
        <span className="workspace-title">{labels[locale][activeIndex] ?? "A1 Mobi"}</span>
        <select className="mobile-workspaces" aria-label={ar ? "انتقل إلى قسم" : "Go to workspace"}
          value={activeIndex >= 0 ? "/" + locale + paths[activeIndex] : ""}
          onChange={event => router.push(event.target.value)}>
          {activeIndex < 0 && <option value="" disabled>A1 Mobi</option>}
          {labels[locale].map((label, index) => <option key={paths[index]} value={"/" + locale + paths[index]}>{label}</option>)}
        </select>
        <div className="top-actions">
          <Link className="locale" href={"/" + locale + "/login"}>{ar ? "حساب المتجر" : "Store account"}</Link>
          <span className="environment-label">{ar ? "معاينة" : "Preview"}</span>
          <Link className="locale" href={otherPath} hrefLang={other}
            aria-label={ar ? "Switch to English" : "التبديل إلى العربية"}>{ar ? "EN" : "العربية"}</Link>
        </div>
      </header>
      <div id="main-content" tabIndex={-1}>{children}</div>
      <nav ref={mobileNav} className="mobile-nav" aria-label={ar ? "أقسام المتجر" : "Store workspaces"}>{navigation(true)}</nav>
    </div>
  </div>;
}
