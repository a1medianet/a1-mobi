from pathlib import Path
import re
root=Path(r"C:\A1Hub\a1-mobi")
p=root/"src/components/repair-live-operations.tsx"
s=p.read_text(encoding="utf8")
assert "mobi-live02-case-detail" not in s
s=s.replace('   issueLabel:"العطل",deviceLabel:"الجهاز",ticketState:"حالة الطلب",notPriced:"لم تُحدد بعد",',
'''   issueLabel:"العطل",deviceLabel:"الجهاز",ticketState:"حالة الطلب",notPriced:"لم تُحدد بعد",
   openTicket:"فتح الطلب",caseDetails:"تفاصيل طلب الصيانة",closeTicket:"إغلاق التفاصيل",
   nextAction:"الإجراء التالي",noAction:"لا توجد إجراءات متاحة لهذه الحالة",''',1)
s=s.replace('   issueLabel:"Issue",deviceLabel:"Device",ticketState:"Status",notPriced:"Not yet priced",',
'''   issueLabel:"Issue",deviceLabel:"Device",ticketState:"Status",notPriced:"Not yet priced",
   openTicket:"Open ticket",caseDetails:"Repair ticket details",closeTicket:"Close details",
   nextAction:"Next action",noAction:"No further action for this status",''',1)
s=s.replace(' const [statusFilter,setStatusFilter]=useState<RepairListFilter>("ALL");',
''' const [statusFilter,setStatusFilter]=useState<RepairListFilter>("ALL");
 const [selectedOrderId,setSelectedOrderId]=useState<string|null>(null);''',1)
s=s.replace(' const selected=pending.find(o=>o.id===selectedId);',
''' const selected=pending.find(o=>o.id===selectedId);
 const selectedOrder=orders.find(o=>o.id===selectedOrderId);
 useEffect(()=>{
  if(!selectedOrderId)return;
  document.getElementById("mobi-repair-selected")?.scrollIntoView({behavior:"smooth",block:"start"});
 },[selectedOrderId]);''',1)
start=s.index('      <td className="mobi-live02-actions">')
end=s.index('      </td></tr>)}',start)
old=s[start+len('      <td className="mobi-live02-actions">'):end]
assert "RepairSettlementControls" in old and "readyId" in old
actions=re.sub(r'\bo\b','selectedOrder',old)
replacement='''      <td className="mobi-live02-actions"><button type="button" className="mobi-live02-open"
       aria-expanded={selectedOrderId===o.id} aria-controls="mobi-repair-selected"
       onClick={()=>{setSelectedOrderId(o.id);if(selectedOrderId===o.id)document.getElementById("mobi-repair-selected")?.scrollIntoView({behavior:"smooth",block:"start"});}}>
       {t.openTicket}</button>'''
s=s[:start]+replacement+s[end:]
endmarker='    </tbody></table></div>\n  </section>\n </main>;'
assert s.count(endmarker)==1
panel='''    </tbody></table></div>
   {selectedOrder&&<section id="mobi-repair-selected" className="mobi-live02-case-detail"
     aria-label={t.caseDetails}>
    <header className="mobi-live02-case-head">
     <div><span>{t.caseDetails}</span>
      <h3><bdi dir="ltr">{selectedOrder.number}</bdi> · {selectedOrder.customerName}</h3>
      <p>{selectedOrder.device} · {t.issueLabel}: {selectedOrder.issue}</p>
     </div>
     <button type="button" className="mobi-live02-close"
      onClick={()=>setSelectedOrderId(null)}>{t.closeTicket}</button>
    </header>
    <div className="mobi-live02-case-content">
     <div className="mobi-live02-case-data">
      <div><span>{t.ticketState}</span><strong className={"mobi-live02-status mobi-live02-status-"+selectedOrder.status.toLowerCase()}>{statusLabel(selectedOrder.status)}</strong></div>
      <div><span>{t.intakeDate}</span><strong>{new Date(selectedOrder.intakeAt).toLocaleDateString(locale==="ar"?"ar-LB":"en-GB")}</strong></div>
      <div><span>{t.estimate}</span><strong>{selectedOrder.estimate===null?t.notPriced:selectedOrder.estimate.toFixed(2)+" USD"}</strong></div>
      <div><span>{t.balance}</span><strong>{selectedOrder.balanceDue.toFixed(2)} USD</strong></div>
      {selectedOrder.imeiLast4&&<div><span>IMEI</span><strong dir="ltr">••••{selectedOrder.imeiLast4}</strong></div>}
     </div>
     <div className="mobi-live02-panel-actions">
      <h4>{t.nextAction}</h4>
'''+actions+'''     {["INTAKE","DIAGNOSIS","DELIVERED","CANCELLED"].includes(selectedOrder.status)&&
       <p className="module-sub">{t.noAction}</p>}
     </div>
    </div>
   </section>}
  </section>
 </main>;'''
s=s.replace(endmarker,panel,1)
p.write_text(s,encoding="utf8",newline="\n")
print("OPERATIONAL_ACTIONS_MOVED_OUT_OF_TABLE_TO_SELECTED_CASE_PANEL")
