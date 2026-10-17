from pathlib import Path
p=Path(r"C:\A1Hub\a1-mobi\src\components\repair-live-operations.tsx")
s=p.read_text(encoding="utf8")
old='const [estimate,setEstimate]=useState("120"),[labor,setLabor]=useState("0"),[direct,setDirect]=useState("0");\n const [finalPrice,setFinalPrice]=useState("120");'
new='const [estimate,setEstimate]=useState(""),[labor,setLabor]=useState("0"),[direct,setDirect]=useState("0");\n const [finalPrice,setFinalPrice]=useState("");\n const [readyId,setReadyId]=useState<string|null>(null);'
assert s.count(old)==1,s.count(old)
s=s.replace(old,new)
s=s.replace('value={estimate} onChange={e=>setEstimate(e.target.value)}','value={estimate} onChange={e=>setEstimate(e.target.value)}',1)
old='''{o.status==="IN_PROGRESS"?<details className="mobi-live02-ready">
        <summary>{t.ready}</summary>
        <form onSubmit={event=>{event.preventDefault();void send({action:"ready",repairId:o.id,
         finalPrice:Number(finalPrice),laborCost:Number(labor),directCost:Number(direct)});}}>'''
new='''{o.status==="IN_PROGRESS"?<details className="mobi-live02-ready" open={readyId===o.id} onToggle={e=>{
         if(e.currentTarget.open){
          setReadyId(o.id);setFinalPrice("");setLabor("0");setDirect("0");
         }else if(readyId===o.id){setReadyId(null);}
        }}>
        <summary>{t.ready}</summary>
        <form onSubmit={event=>{event.preventDefault();
         if(readyId!==o.id || !finalPrice.trim())return;
         if(!window.confirm(locale==="ar"?"تأكيد السعر النهائي وحالة الجهاز جاهز للاستلام؟":"Confirm the final amount and mark this repair ready?"))return;
         void send({action:"ready",repairId:o.id,
         finalPrice:Number(finalPrice),laborCost:Number(labor),directCost:Number(direct)});
        }}>'''
assert s.count(old)==1,s.count(old)
s=s.replace(old,new)
s=s.replace('value={finalPrice} onChange={e=>setFinalPrice(e.target.value)}','placeholder={o.estimate?.toFixed(2)??""} value={finalPrice} onChange={e=>setFinalPrice(e.target.value)}',1)
s=s.replace('<button type="submit" disabled={busy}>{t.submitReady}</button>','<button type="submit" disabled={busy||readyId!==o.id||!finalPrice.trim()}>{t.submitReady}</button>',1)
p.write_text(s,encoding="utf8",newline="\n")
print("REPAIR_FINANCIAL_UI_EXPLICIT_AMOUNT_AND_CONFIRMATION")
