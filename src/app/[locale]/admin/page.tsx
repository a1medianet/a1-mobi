import Link from "next/link";
import { notFound } from "next/navigation";
import { demoCatalogCounts, demoLowStock, demoStaff, demoStore } from "@/demo/data";

const copy = {
  ar: {
    back:"لوحة التحكم", title:"الإدارة", subtitle:"نظرة المالك على الفرع، الكتالوج، الفريق، الأمن والجاهزية",
    notice:"Pilot Demo — هذه الصفحة تعرض بيانات تشغيل تجريبية ولا تمنح صلاحيات إدارية حقيقية قبل ربط RBAC بالكامل.",
    branch:"الفرع", mode:"الوضع", catalog:"الكتالوج", team:"الفريق", low:"تنبيهات المخزون", security:"أمان الحساب",
    products:"إدارة المنتجات", access:"الفريق والصلاحيات", accountSecurity:"المصادقة والأمان", open:"فتح",
    readiness:"جاهزية النظام", auth:"Authentication", control:"Users / Roles / RBAC", abuse:"Abuse controls", ops:"Operations / Backup / CI",
    account:"MFA / Recovery", foundation:"Application Foundation", pass:"PASS", hardening:"HARDENING", partial:"PARTIAL",
    lowTitle:"منتجات تحتاج متابعة", stock:"مخزون", reorder:"حد إعادة الطلب", product:"المنتج",
    roles:"توزيع الفريق التجريبي", role:"الدور", email:"البريد", status:"الحالة",
    costGuard:"حماية التكلفة والربح", costGuardText:"صفحات البيع العامة لا تعرض تكلفة الشراء أو هامش الربح. كشفها يجب أن يبقى مرتبطًا بصلاحية إدارية صريحة.",
  },
  en: {
    back:"Dashboard", title:"Admin", subtitle:"Owner view across branch, catalog, team, security, and readiness",
    notice:"Pilot Demo — this page shows operational demo data and does not grant live admin authority until RBAC is fully wired.",
    branch:"Branch", mode:"Mode", catalog:"Catalog", team:"Team", low:"Stock alerts", security:"Account security",
    products:"Manage products", access:"Team & access", accountSecurity:"MFA & recovery", open:"Open",
    readiness:"System readiness", auth:"Authentication", control:"Users / Roles / RBAC", abuse:"Abuse controls", ops:"Operations / Backup / CI",
    account:"MFA / Recovery", foundation:"Application Foundation", pass:"PASS", hardening:"HARDENING", partial:"PARTIAL",
    lowTitle:"Products needing attention", stock:"Stock", reorder:"Reorder level", product:"Product",
    roles:"Pilot team roles", role:"Role", email:"Email", status:"Status",
    costGuard:"Cost & profit guard", costGuardText:"General sales surfaces do not expose purchase cost or margin. Those values must remain behind an explicit admin permission.",
  },
} as const;

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "ar" && locale !== "en") notFound();
  const t = copy[locale];
  const counts = demoCatalogCounts();
  const low = demoLowStock();
  const readiness = [
    [t.auth,t.pass,"done"],[t.control,t.pass,"done"],[t.abuse,t.pass,"done"],[t.ops,t.pass,"done"],
    [t.account,t.hardening,"pending"],[t.foundation,t.partial,"pending"],
  ] as const;

  return <main className="module-page admin-page">
    <header className="module-header"><div>
      <Link href={"/"+locale} className="back-link">{t.back}</Link>
      <p className="module-kicker">A1 MOBI · OWNER / ADMIN</p>
      <h1>{t.title}</h1><p className="module-sub">{t.subtitle}</p>
    </div></header>

    <p className="preview-notice" role="status">{t.notice}</p>

    <section className="admin-summary-grid">
      <article><small>{t.branch}</small><strong>{locale==="ar"?demoStore.branchAr:demoStore.branchEn}</strong></article>
      <article><small>{t.mode}</small><strong>PILOT DEMO</strong></article>
      <article><small>{t.catalog}</small><strong>{counts.total}</strong></article>
      <article><small>{t.team}</small><strong>{demoStaff.length}</strong></article>
      <article><small>{t.low}</small><strong>{counts.lowStock}</strong></article>
    </section>

    <section className="admin-action-grid">
      <Link href={"/"+locale+"/products"}><span>▦</span><div><b>{t.products}</b><small>{t.open} →</small></div></Link>
      <Link href={"/"+locale+"/settings/team"}><span>♙</span><div><b>{t.access}</b><small>{t.open} →</small></div></Link>
      <Link href={"/"+locale+"/settings/security"}><span>⌾</span><div><b>{t.accountSecurity}</b><small>{t.open} →</small></div></Link>
    </section>

    <div className="admin-two-col">
      <section className="activity-card admin-readiness">
        <div className="section-head"><h2>{t.readiness}</h2></div>
        <div className="readiness-list">{readiness.map(([label,value,tone]) =>
          <div key={label}><span>{label}</span><b className={"pill "+tone}>{value}</b></div>)}
        </div>
      </section>

      <section className="activity-card">
        <div className="section-head"><h2>{t.lowTitle}</h2></div>
        <div className="table-wrap"><table><thead><tr><th>{t.product}</th><th>{t.stock}</th><th>{t.reorder}</th></tr></thead>
          <tbody>{low.map(product => <tr key={product.id}>
            <td><b>{locale==="ar"?product.nameAr:product.nameEn}</b><br/><small><bdi dir="ltr">{product.sku}</bdi></small></td>
            <td>{product.stock}</td><td>{product.reorderAt}</td>
          </tr>)}</tbody></table></div>
      </section>
    </div>

    <section className="activity-card">
      <div className="section-head"><div><h2>{t.roles}</h2><p>{t.costGuardText}</p></div><span className="period">{t.costGuard}</span></div>
      <div className="table-wrap"><table><thead><tr><th>{t.team}</th><th>{t.email}</th><th>{t.role}</th><th>{t.status}</th></tr></thead>
        <tbody>{demoStaff.map(staff => <tr key={staff.email}>
          <td>{locale==="ar"?staff.nameAr:staff.nameEn}</td><td><bdi dir="ltr">{staff.email}</bdi></td>
          <td>{locale==="ar"?staff.roleAr:staff.roleEn}</td><td><span className="pill done">{staff.status}</span></td>
        </tr>)}</tbody></table></div>
    </section>
  </main>;
}
