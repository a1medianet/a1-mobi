from pathlib import Path
p=Path(r"C:\A1Hub\a1-mobi\versions\C-LIVE-02")
s=(p/"c-live-02-vp03-browser.mjs").read_text(encoding="utf8")
assert s.count('desktop.stats[0]==="5"')==1
s=s.replace('desktop.stats[0]==="5"','Number(desktop.stats[0])===desktop.rowCount')
s=s.replace('must match 5','must match visible records')
s=s.replace('9226','9229').replace('chrome-uat-visual-pass03','chrome-uat-visual-pass04')
s=s.replace('c-live-02-vp03-','c-live-02-vp04-')
a=' await capture(cdp,"c-live-02-vp04-table-desktop");'
assert s.count(a)==1
b=''' await capture(cdp,"c-live-02-vp04-table-desktop");
 const historyApi=await evaluate(cdp,'(async()=>{const r=await fetch("/api/ops/live-02?q="+encodeURIComponent("UAT-FIN-03"),{cache:"no-store"});const j=await r.json();return {status:r.status,matched:j.matchedCount,items:j.orders?.length,customer:j.orders?.[0]?.customerName};})()');
 assert(historyApi.status===200&&historyApi.matched===1&&historyApi.items===1,"Archived search API failed "+JSON.stringify(historyApi));
 console.log("C_LIVE_02_VP04_SERVER_SEARCH_UI_PASS",JSON.stringify(historyApi));
'''
s=s.replace(a,b)
s=s.replace('C_LIVE_02_VP03_CASE_PANEL_PASS','C_LIVE_02_VP04_CASE_PANEL_PASS')
s=s.replace('C_LIVE_02_REAL_DATA_VISUAL_PASS','C_LIVE_02_VP04_REAL_DATA_VISUAL_PASS')
(p/"c-live-02-vp04-browser.mjs").write_text(s,encoding="utf8",newline="\n")
print("VP04_BROWSER_PREPARED")
