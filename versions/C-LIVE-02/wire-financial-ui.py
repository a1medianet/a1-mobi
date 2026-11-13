from pathlib import Path
p=Path(r"C:\A1Hub\a1-mobi\src\components\repair-live-operations.tsx")
s=p.read_text(encoding="utf8")
def change(a,b):
 global s
 if s.count(a)!=1:raise Exception(f"unexpected match count {s.count(a)} for {a[:65]}")
 s=s.replace(a,b,1)
change('import { useEffect, useState } from "react";','import { useEffect, useRef, useState } from "react";')
change('timeline:{status:string;at:string}[];', 'timeline:{status:string;at:string}[];\n warranty:{number:string;expiresAt:string;status:string}|null;')
change('error:"تعذّر تنفيذ العملية",balance:"الرصيد المستحق",',
'''error:"تعذّر تنفيذ العملية",balance:"الرصيد المستحق",
 cashOpen:"الصندوق مفتوح",cashClosed:"يجب فتح الصندوق قبل تحصيل الدفعات",
 openingUsd:"الرصيد الافتتاحي (USD)",openingLbp:"الرصيد الافتتاحي (LBP)",
 exchangeRate:"سعر صرف الليرة للدولار",openTill:"فتح الصندوق",
 payment:"تحصيل نقدي",amount:"المبلغ المستلم بالدولار",takePayment:"تسجيل الدفعة",
 settled:"تم تسديد القيمة",deliver:"تسليم الجهاز للعميل",
 pickup:"أؤكد أن العميل استلم الجهاز بالفعل",warrantyDays:"مدة الضمان بالأيام",
 warrantyTerms:"شروط الضمان",confirmDelivery:"تأكيد التسليم وإصدار الضمان",
 warranty:"الضمان",until:"ساري حتى",paid:"المدفوع",''')
change('error:"Unable to complete request",balance:"Balance due",',
'''error:"Unable to complete request",balance:"Balance due",
 cashOpen:"Cash drawer open",cashClosed:"Open the cash drawer before recording cash payments",
 openingUsd:"Opening cash (USD)",openingLbp:"Opening cash (LBP)",
 exchangeRate:"LBP per USD exchange rate",openTill:"Open cash drawer",
 payment:"Cash collection",amount:"Cash received (USD)",takePayment:"Record payment",
 settled:"Fully paid",deliver:"Hand device to customer",
 pickup:"I confirm the customer received the device",warrantyDays:"Warranty duration (days)",
 warrantyTerms:"Warranty terms",confirmDelivery:"Confirm pickup and issue warranty",
 warranty:"Warranty",until:"Valid until",paid:"Paid",''')
change(' const [message,setMessage]=useState(""),[loading,setLoading]=useState(true);',
''' const [message,setMessage]=useState(""),[loading,setLoading]=useState(true);
 const [cashOpen,setCashOpen]=useState(false);
 const [openingUsd,setOpeningUsd]=useState("0"),[openingLbp,setOpeningLbp]=useState("0");
 const [exchangeRate,setExchangeRate]=useState("");''')
change('  setOrders(data.orders as Order[]);','  setOrders(data.orders as Order[]);setCashOpen(Boolean(data.cashOpen));')
change('   if(active)setOrders(data.orders as Order[]);','   if(active){setOrders(data.orders as Order[]);setCashOpen(Boolean(data.cashOpen));}')
change('   if(payload.action==="estimate")setSelectedId("");',
'''   if(payload.action==="estimate")setSelectedId("");
   return true;''')
change('  }catch(e){setMessage(t.error+": "+(e instanceof Error?e.message:"UNKNOWN"));}',
'''  }catch(e){setMessage(t.error+": "+(e instanceof Error?e.message:"UNKNOWN"));return false;}''')
change('  <section className="mobi-live02-forms">',
'''  {!loading&&<section className="mobi-live02-cash">
   <h2>{cashOpen?t.cashOpen:t.cashClosed}</h2>
   {!cashOpen&&<form onSubmit={event=>{event.preventDefault();
    if(!window.confirm(locale==="ar"?"هل تريد فتح صندوق الفرع بالقيم المدخلة؟":"Open this branch's cash drawer with these balances?"))return;
    void send({action:"openCash",openingUsd:Number(openingUsd),openingLbp:Number(openingLbp),
      openingExchangeRate:Number(exchangeRate)});
   }}>
    <label>{t.openingUsd}<input required type="number" min="0" step="0.01" value={openingUsd}
      onChange={e=>setOpeningUsd(e.target.value)}/></label>
    <label>{t.openingLbp}<input required type="number" min="0" step="1" value={openingLbp}
      onChange={e=>setOpeningLbp(e.target.value)}/></label>
    <label>{t.exchangeRate}<input required type="number" min="1" step="0.01" value={exchangeRate}
      onChange={e=>setExchangeRate(e.target.value)}/></label>
    <button className="primary" type="submit" disabled={busy||!exchangeRate}>{t.openTill}</button>
   </form>}
  </section>}
  <section className="mobi-live02-forms">''')
change('       {o.status==="READY"?<span>{t.balance}: {o.balanceDue.toFixed(2)} USD</span>:null}',
'''       {(o.status==="READY"||o.status==="DELIVERED")&&<RepairSettlementControls
        order={o} locale={locale} t={t} cashOpen={cashOpen} busy={busy} send={send}/>}''')
# extra nested component, no direct hooks in each loop
s += '''

function RepairSettlementControls({order,locale,t,cashOpen,busy,send}:{
 order:Order;locale:"ar"|"en";t:typeof dict["ar"]|typeof dict["en"];cashOpen:boolean;busy:boolean;
 send:(payload:Record<string,unknown>)=>Promise<boolean>;
}){
 const [amount,setAmount]=useState("");
 const retry=useRef<{amount:string;key:string}|null>(null);
 const [warrantyDays,setWarrantyDays]=useState("30");
 const [warrantyTerms,setWarrantyTerms]=useState("");
 const [pickedUp,setPickedUp]=useState(false);
 if(order.status==="DELIVERED")return <div className="mobi-live02-settlement">
   <strong>{t.paid}: {order.paidTotal.toFixed(2)} USD</strong>
   {order.warranty&&<p>{t.warranty}: <bdi dir="ltr">{order.warranty.number}</bdi>
    {" · "}{t.until} {new Date(order.warranty.expiresAt).toLocaleDateString(locale==="ar"?"ar-LB":"en-US")}</p>}
  </div>;
 if(order.status!=="READY")return null;
 async function pay(){
  const value=Number(amount);
  if(!cashOpen||!Number.isFinite(value)||value<=0||value>order.balanceDue)return;
  if(!window.confirm(locale==="ar"?"هل استلمت هذا المبلغ نقدًا فعلًا؟":"Have you physically received this cash amount?"))return;
  if(!retry.current||retry.current.amount!==amount){
    retry.current={amount,key:crypto.randomUUID()};
  }
  const done=await send({action:"pay",repairId:order.id,amount:value,
    idempotencyKey:retry.current.key});
  if(done){retry.current=null;setAmount("");}
 }
 async function deliver(){
  if(!pickedUp||order.balanceDue>0||!warrantyTerms.trim())return;
  if(!window.confirm(locale==="ar"?"تأكيد تسليم الجهاز وإصدار الضمان؟":"Confirm device pickup and issue warranty?"))return;
  await send({action:"deliver",repairId:order.id,confirmedPickup:true,
    warrantyDays:Number(warrantyDays),warrantyTerms});
 }
 return <div className="mobi-live02-settlement">
  <p><strong>{t.paid}: {order.paidTotal.toFixed(2)} USD</strong>
   {" · "}{t.balance}: {order.balanceDue.toFixed(2)} USD</p>
  {order.balanceDue>0?<form onSubmit={event=>{event.preventDefault();void pay();}}>
    <label>{t.amount}<input required type="number" min="0.01"
      max={order.balanceDue} step="0.01" value={amount} onChange={event=>setAmount(event.target.value)}/></label>
    <button type="submit" disabled={busy||!cashOpen||!amount}>{t.takePayment}</button>
    {!cashOpen&&<small>{t.cashClosed}</small>}
   </form>:<form onSubmit={event=>{event.preventDefault();void deliver();}}>
    <strong>{t.settled}</strong>
    <label>{t.warrantyDays}<input type="number" min="1" max="365" step="1" required
      value={warrantyDays} onChange={event=>setWarrantyDays(event.target.value)}/></label>
    <label>{t.warrantyTerms}<input required minLength={5} maxLength={1000}
      value={warrantyTerms} onChange={event=>setWarrantyTerms(event.target.value)}/></label>
    <label className="mobi-live02-pickup"><input type="checkbox" required
      checked={pickedUp} onChange={event=>setPickedUp(event.target.checked)}/>{t.pickup}</label>
    <button type="submit" disabled={busy||!pickedUp||!warrantyTerms.trim()}>{t.confirmDelivery}</button>
   </form>}
 </div>;
}
'''
p.write_text(s,encoding="utf8",newline="\n")
print("C-LIVE-02 CASH PAYMENT AND WARRANTY UI WIRED")
