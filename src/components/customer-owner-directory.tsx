import Link from "next/link";
import CustomerCreatePanel from "@/components/customer-create-panel";
import { currentStoreContext } from "@/server/auth-http";
import { getBranchCustomerDirectory } from "@/modules/customers/customer-owner-directory";

const copy={
  ar: {
    back:"لوحة التحكم", title:"عملاء الفرع",
    sub:"ملفات العملاء المسجلين في هذا الفرع، من قاعدة المتجر المحفوظة",
    notice:"بيئة اختبار: هذه قائمة فعلية من سجلات الفرع، وليست قائمة أسماء وأرقام تجريبية ثابتة.",
    total:"إجمالي المسجلين", shown:"السجلات المعروضة", table:"دليل العملاء",
    name:"العميل", phone:"الهاتف", created:"تاريخ التسجيل",
    empty:"لا يوجد عملاء مسجلون في هذا الفرع بعد.",
    debt:"أرصدة الديون تحتاج مطابقة مستقلة بين الفروع قبل عرضها هنا؛ لا نعرض أرقامًا تقديرية.",
    denied:"ليس لديك إذن لقراءة بيانات العملاء.",
  },
  en: {
    back:"Dashboard", title:"Branch customers",
    sub:"Saved customer profiles registered at this branch",
    notice:"Test environment: these are saved branch records, not fixed sample customer cards.",
    total:"Registered customers", shown:"Displayed records", table:"Customer directory",
    name:"Customer", phone:"Phone", created:"Registered",
    empty:"No customers registered at this branch yet.",
    debt:"Debt balances require a separate cross-branch reconciliation before display. No estimated amounts are shown.",
    denied:"You do not have permission to read customer records.",
  }
} as const;

export default async function CustomerOwnerDirectory({locale}:{locale:"ar"|"en"}) {
  const t=copy[locale];
  let ctx;
  try {ctx=await currentStoreContext("customers.read");}
  catch(error) {
    if(error instanceof Error && error.message==="PERMISSION_DENIED")
      return <main className="module-page"><p className="preview-notice" role="alert">{t.denied}</p></main>;
    throw error;
  }
  const rows=await getBranchCustomerDirectory({tenantId:ctx.tenantId,branchId:ctx.branchId});
  const date=(value:string)=>new Intl.DateTimeFormat(locale==="ar"?"ar-LB":"en-GB",
    {numberingSystem:"latn",dateStyle:"medium",timeZone:"Asia/Beirut"}).format(new Date(value));
  return <main className="module-page">
    <header className="module-header"><div>
      <Link href={"/"+locale} className="back-link">{t.back}</Link>
      <h1>{t.title}</h1><p className="module-sub">{t.sub}</p>
    </div></header>
    {ctx.permissions.has("foundation.manage") && <>
      <CustomerCreatePanel locale={locale} />
      <p style={{marginBlock:"0 10px"}}><Link className="soft-btn" href={"/"+locale+"/debts"}>{locale==="ar"?"الديون والتحصيل":"Debts and collections"}</Link></p>
      <div style={{display:"flex",justifyContent:locale==="ar"?"flex-start":"flex-start",marginBlock:"0 16px"}}>
        <a className="soft-btn" href="/api/ops/customers/export" download="mobi-customers.csv" style={{display:"inline-flex",alignItems:"center",gap:"8px",padding:"10px 16px",textDecoration:"none",border:"1px solid #cbd9ed",borderRadius:"9px",background:"#fff",fontWeight:700}}>{locale==="ar"?"↓ تصدير العملاء إلى Excel":"↓ Export customers to Excel"}</a>
      </div>
    </>}
    <section className="metrics ops-metrics" aria-label={t.title}>
      {[[t.total,rows.total],[t.shown,rows.shown]].map(([label,count])=>
        <article key={label} className="metric"><div className="metric-icon blue">♙</div>
          <div className="metric-body"><p>{label}</p><strong>{count}</strong></div>
        </article>)}
    </section>
    <section className="activity-card">
      <div className="section-head"><h2>{t.table}</h2></div>
      <div className="table-wrap"><table><thead><tr>
        <th>{t.name}</th><th>{t.phone}</th><th>{t.created}</th>
      </tr></thead><tbody>
      {rows.customers.length === 0 ? <tr><td colSpan={3}>{t.empty}</td></tr> :
        rows.customers.map(customer => <tr key={customer.id}>
          <td>{customer.name}</td>
          <td><bdi dir="ltr">{customer.phone}</bdi></td>
          <td><bdi dir="auto">{date(customer.registeredAt)}</bdi></td>
        </tr>)}
      </tbody></table></div>
    </section>
  </main>;
}
