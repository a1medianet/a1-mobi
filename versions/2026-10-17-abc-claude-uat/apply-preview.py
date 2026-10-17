from pathlib import Path
R=Path(r"C:\A1Hub\a1-mobi")
def edit(rel,a,b):
 f=R/rel
 s=f.read_text(encoding="utf-8")
 if s.count(a)!=1: raise RuntimeError(f"{rel}: expected one match, found {s.count(a)} for {a[:60]!r}")
 f.write_text(s.replace(a,b,1),encoding="utf-8",newline="\n")
 print("PATCHED",rel)
p="src/components/store-preview-controls.tsx"
edit(p,'cartUnavailable:"السلة غير مفعّلة في المعاينة",','cartUnavailable:"لا يمكن إرسال طلب أو دفع في المعاينة",basket:"سلة المعاينة",basketNote:"سلة تفاعلية للتوضيح فقط؛ لا تُنشئ طلبًا ولا تخصم دفعة.",basketEmpty:"السلة فارغة",basketTotal:"المجموع التوضيحي",basketClear:"إفراغ السلة",basketClose:"إغلاق السلة",basketOpen:"فتح السلة",repairExplore:"استكشف الصيانة",')
edit(p,'cartUnavailable:"Cart is not enabled in preview",','cartUnavailable:"No checkout or payment is available in this demo",basket:"Preview basket",basketNote:"Interactive demo only. No real order or payment is created.",basketEmpty:"Basket is empty",basketTotal:"Illustrative total",basketClear:"Clear basket",basketClose:"Close basket",basketOpen:"Open basket",repairExplore:"Explore repairs",')
edit(p,'  const [query,setQuery]=useState("");','  const [query,setQuery]=useState("");\n  const [basket,setBasket]=useState<Record<string,number>>({});\n  const [basketOpen,setBasketOpen]=useState(false);')
edit(p,'  ),[products,term]);','''  ),[products,term]);
  const basketItems=useMemo(()=>products.filter(item=>(basket[item.id]??0)>0),[basket,products]);
  const basketCount=basketItems.reduce((sum,item)=>sum+(basket[item.id]??0),0);
  const basketTotal=basketItems.reduce((sum,item)=>sum+item.price*(basket[item.id]??0),0);
  function addDemo(id:string){setBasket(old=>({...old,[id]:Math.min(9,(old[id]??0)+1)}));setBasketOpen(true);}
  function reduceDemo(id:string){setBasket(old=>({...old,[id]:Math.max(0,(old[id]??0)-1)}));}''')
edit(p,'      <div className="mobi-store-header-actions">\n        <button className="mobi-store-whatsapp"','''      <div className="mobi-store-header-actions">
        <button className="mobi-store-basket-trigger" type="button" aria-label={t.basketOpen} aria-expanded={basketOpen} aria-controls="mobi-store-basket" onClick={()=>setBasketOpen(old=>!old)}>▤ <strong>{basketCount}</strong></button>
        <button className="mobi-store-whatsapp"''')
edit(p,'<button type="button" className="mobi-store-btn mobi-store-btn-secondary" disabled title={t.repairUnavailable}>{t.repair}</button>','<button type="button" className="mobi-store-btn mobi-store-btn-secondary" onClick={()=>scrollTo("services")}>{t.repairExplore}</button>')
edit(p,'<button type="button" disabled title={t.cartUnavailable}>{t.add}</button>','<button className="mobi-store-add" type="button" onClick={()=>addDemo(product.id)}>{t.add}</button>')
edit(p,'''    </footer>
  </main>;''','''    </footer>
    {basketOpen&&<aside id="mobi-store-basket" className="mobi-store-basket-panel" role="dialog" aria-modal="false" aria-label={t.basket}>
      <div className="mobi-store-basket-title"><h2>{t.basket} ({basketCount})</h2><button type="button" aria-label={t.basketClose} onClick={()=>setBasketOpen(false)}>×</button></div>
      <p className="mobi-store-basket-notice">{t.basketNote}</p>
      {basketItems.length===0?<p role="status">{t.basketEmpty}</p>:<>
        <ul className="mobi-store-basket-list">{basketItems.map(item=><li key={item.id}>
          <span>{ar?item.nameAr:item.nameEn}</span>
          <div><button type="button" aria-label={"− "+(ar?item.nameAr:item.nameEn)} onClick={()=>reduceDemo(item.id)}>−</button><b>{basket[item.id]}</b><button type="button" aria-label={"+ "+(ar?item.nameAr:item.nameEn)} onClick={()=>addDemo(item.id)}>+</button></div>
        </li>)}</ul>
        <div className="mobi-store-basket-total"><span>{t.basketTotal}</span><strong dir="ltr">{"$"+basketTotal.toLocaleString("en-US")}</strong></div>
        <button className="mobi-store-basket-clear" type="button" onClick={()=>setBasket({})}>{t.basketClear}</button>
        <p className="mobi-store-basket-notice">{t.cartUnavailable}</p>
      </>}
    </aside>}
  </main>;''')
css=R/"src/app/globals.css"
s=css.read_text(encoding="utf-8")
if "A1 MOBI CLAUDE B PREVIEW CART 20261017" in s:raise RuntimeError("CSS already patched")
css.write_text(s+'''
/* A1 MOBI CLAUDE B PREVIEW CART 20261017 — sample interactions, never checkout. */
.mobi-store-basket-trigger{border:1px solid #dce7f8;background:#eef5ff;color:#1265e8;cursor:pointer;display:inline-flex;gap:5px;align-items:center}
.mobi-store-basket-trigger strong{display:inline-grid;place-items:center;border-radius:30px;background:#1265e8;color:white;font-size:11px;min-width:21px;height:21px}
.mobi-store-basket-panel{position:fixed;z-index:80;inset-inline-end:18px;top:82px;width:min(380px,calc(100vw - 28px));max-height:calc(100dvh - 94px);overflow:auto;box-shadow:0 20px 55px #14233d30;border:1px solid #dce7f8;background:#fff;border-radius:18px;padding:18px;color:#14233d}
.mobi-store-basket-title{display:flex;align-items:center;justify-content:space-between;gap:12px}
.mobi-store-basket-title h2{margin:0;font-size:17px;font-family:"Alexandria","IBM Plex Sans Arabic",sans-serif}
.mobi-store-basket-title button{border:0;background:#f1f5fb;border-radius:9px;width:38px;height:38px;font-size:25px;cursor:pointer}
.mobi-store-basket-notice{font-size:12px;line-height:1.7;color:#66748d;background:#f5f9ff;padding:10px;border-radius:9px;margin:12px 0}
.mobi-store-basket-list{margin:8px 0;padding:0;list-style:none}.mobi-store-basket-list li{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #eef1f6;font-size:12px}
.mobi-store-basket-list li>span{min-width:0;overflow-wrap:anywhere}.mobi-store-basket-list li>div{display:flex;align-items:center;gap:8px;flex-shrink:0}
.mobi-store-basket-list li button{width:31px;height:31px;border-radius:8px;border:1px solid #dce7f8;background:#eef5ff;color:#1265e8;cursor:pointer}
.mobi-store-basket-total{display:flex;justify-content:space-between;align-items:center;margin:10px 0;color:#1265e8;font-weight:750}
.mobi-store-basket-clear{cursor:pointer;border:1px solid #dce7f8;border-radius:9px;padding:9px 12px;background:#fff}
.mobi-store-basket-trigger:focus-visible,.mobi-store-basket-panel button:focus-visible,.mobi-store-add:focus-visible{outline:3px solid #ff7a1a;outline-offset:2px}
@media(max-width:640px){.mobi-store-basket-panel{inset-inline:14px;top:114px;width:auto}.mobi-store-header-actions .mobi-store-basket-trigger{padding-inline:7px}}
''',encoding="utf-8",newline="\n")
print("PATCHED CSS")
q="scripts/abc-browser-qa.mjs"
edit(q,'assert(await evaluate(cdp, \'document.querySelector(".mobi-store-btn-secondary")?.disabled === true\'), "B repair booking must not fake success");','assert(await evaluate(cdp, \'document.querySelector(".mobi-store-btn-secondary")?.disabled === false\'), "B repair information must remain accessible");')
edit(q,'assert(await evaluate(cdp, \'[...document.querySelectorAll(".mobi-store-product-body button")].every(button=>button.disabled)\'), "B cart must not fake success before a real cart API exists");','assert(await evaluate(cdp, \'[...document.querySelectorAll(".mobi-store-add")].every(button=>!button.disabled)\'), "B preview basket needs functional add buttons");')
edit(q,'''  assert(await evaluate(cdp, 'document.querySelectorAll(".mobi-store-product").length === 1'), "B search did not filter products");''','''  assert(await evaluate(cdp, 'document.querySelectorAll(".mobi-store-product").length === 1'), "B search did not filter products");
  await evaluate(cdp, 'document.querySelector(".mobi-store-add").click(); true');
  await sleep(200);
  assert(await evaluate(cdp, 'document.querySelector(".mobi-store-basket-panel")?.getAttribute("role") === "dialog"'), "B preview basket must open");
  assert(await evaluate(cdp, 'document.querySelector(".mobi-store-basket-trigger strong")?.textContent === "1"'), "B preview basket count incorrect");
  assert(await evaluate(cdp, 'document.querySelector(".mobi-store-basket-notice")?.textContent.length > 20'), "B preview basket requires an explicit illustrative notice");
  await evaluate(cdp, 'document.querySelector(".mobi-store-basket-title button").click(); true');''')
print("CLAUDE B UI PATCH COMPLETE")
