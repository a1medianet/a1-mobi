import Link from "next/link";

/** Live entry points never substitute sample metrics or readiness claims for store data. */
export function OwnerWorkspace({locale,admin=false}:{locale:"ar"|"en";admin?:boolean}) {
 const ar=locale==="ar";
 const links=admin?[
  ["account","الحساب والاشتراك","Account & subscription"],
  ["products","إدارة المنتجات","Manage products"],
  ["orders","طلبات زبائن المتجر","Customer requests"],
  ["settings/team","الفريق والصلاحيات","Team & access"],
  ["settings/security","أمان الحساب","Account security"],
 ]:[
  ["pos","عملية بيع جديدة","New sale"],
  ["inventory","المخزون والأجهزة","Inventory & devices"],
  ["products","إدارة المنتجات","Manage products"],
  ["repairs","الصيانة","Repairs"],
  ["customers","العملاء","Customers"],
  ["cash","الصندوق","Cash"],
  ["reports","تقارير الفرع","Branch reports"],
  ["orders","طلبات زبائن المتجر","Customer requests"],
  ["admin","الإدارة","Admin"],
 ];
 return <main className="module-page">
  <header className="module-header"><div>
   {admin&&<Link href={"/"+locale}>{ar?"لوحة التحكم":"Dashboard"}</Link>}
   <h1>{admin?(ar?"إدارة المتجر":"Store administration"):(ar?"إدارة متجرك من مكان واحد":"Run your store from one place")}</h1>
   <p>{ar?"اختر المهمة للمتابعة إلى سجلات متجرك.":"Choose a task to open your store records."}</p>
  </div></header>
  <nav className="quick-grid owner-task-grid" aria-label={ar?"مهام المتجر":"Store tasks"}>
   {links.map(([path,labelAr,labelEn])=><Link className="quick-action" href={"/"+locale+"/"+path} key={path}><b>{ar?labelAr:labelEn}</b></Link>)}
  </nav>
 </main>;
}
