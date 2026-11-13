import Link from "next/link";
import { notFound } from "next/navigation";
import { currentStoreContext } from "@/server/auth-http";
import { db } from "@/server/db";
import { reconcileDebtEntries } from "@/modules/debt/debt-reconciliation";
import ManualDebtForm from "@/components/manual-debt-form";

export const dynamic = "force-dynamic";
export default async function DebtsPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  if(locale!=="ar"&&locale!=="en")notFound();
  const ar=locale==="ar";
  const ctx=await currentStoreContext("foundation.manage");
  const customers=await db.customer.findMany({
    where:{tenantId:ctx.tenantId,createdBranchId:ctx.branchId},
    select:{id:true,name:true,debtAccount:{select:{
      id:true,currency:true,balance:true,
      entries:{select:{branchId:true,kind:true,amount:true},take:5001},
    }}},
    orderBy:[{name:"asc"},{id:"asc"}],take:250,
  });
  const rows=customers.map(c=>{
    const account=c.debtAccount;
    let verified=false;
    if(account&&account.entries.length<=5000){
      try {
        verified=reconcileDebtEntries({
          openingBalance:"0",accountBalance:account.balance.toString(),
          entries:account.entries.map(x=>({
            branchId:x.branchId,kind:x.kind,amount:x.amount.toString(),
          })),
        }).reconciled;
      }catch{verified=false;}
    }
    return {id:c.id,name:c.name,currency:account?.currency??"USD",
      balance:verified?account?.balance.toString():null,
      verified};
  });
  return <main className="module-page" dir={ar?"rtl":"ltr"}>
    <header className="module-header">
      <div>
        <Link href={"/"+locale+"/customers"} className="back-link">{ar?"العملاء":"Customers"}</Link>
        <h1>{ar?"الديون والتحصيل":"Debts and collections"}</h1>
        <p className="module-sub">{ar?"حسابات العملاء والمبالغ المستحقة":"Customer accounts and amounts due"}</p>
      </div>
    </header>
    <ManualDebtForm locale={locale} enabled={process.env.A1_MOBI_MANUAL_DEBT_ENABLED==="1"} customers={rows.map(x=>({id:x.id,name:x.name}))}/>
    <section className="activity-card" style={{padding:18}}>
      <h2>{ar?"أرصدة العملاء":"Customer balances"}</h2>
      <div className="table-wrap"><table><thead><tr>
        <th>{ar?"العميل":"Customer"}</th>
        <th>{ar?"الرصيد":"Balance"}</th>
        <th>{ar?"العملة":"Currency"}</th>
      </tr></thead><tbody>
        {rows.length===0?<tr><td colSpan={3}>{ar?"لا يوجد عملاء مسجلون.":"No customers registered."}</td></tr>:
          rows.map(row=><tr key={row.id}><td>{row.name}</td>
            <td><bdi dir="ltr">{row.verified?row.balance:(ar?"تحتاج مراجعة":"Review required")}</bdi></td>
            <td>{row.verified?row.currency:"—"}</td>
          </tr>)}
      </tbody></table></div>
    </section>
  </main>;
}
