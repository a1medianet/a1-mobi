from pathlib import Path
r=Path(r"C:\A1Hub\a1-mobi\versions\C-LIVE-02")
src=(r/"c-live-02-owner-table-browser.mjs").read_text(encoding="utf8")
src=src.replace("9224","9226").replace("chrome-uat-visual-pass02","chrome-uat-visual-pass03")
src=src.replace('rowCount===4','rowCount>=5').replace('rowCount!==4','rowCount<5')
src=src.replace('===4','>=5').replace('==="4"','==="5"')
src=src.replace('!==4','<5').replace('Expected exactly four persisted UAT records','Expected five or more persisted UAT records')
src=src.replace('must match 4','must match 5')
src=src.replace('c-live-02-owner-real-table-desktop','c-live-02-vp03-compact-desktop')
src=src.replace('c-live-02-owner-repair-table-desktop','c-live-02-vp03-table-desktop')
src=src.replace('c-live-02-owner-real-table-mobile','c-live-02-vp03-compact-mobile')
src=src.replace('c-live-02-owner-repair-table-mobile','c-live-02-vp03-table-mobile')
needle=' await capture(cdp,"c-live-02-vp03-table-desktop");'
assert src.count(needle)==1
added="""
 const rowForms=await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody form").length');
 assert(rowForms===0,"Repair action forms must be separated from table rows");
 const selectedClick=await evaluate(cdp,'(() => {const row=[...document.querySelectorAll(".mobi-live02-orders tbody tr")].find(row=>row.querySelector(".mobi-live02-status-ready"));if(!row)return false;row.querySelector(".mobi-live02-open")?.click();return true;})()');
 assert(selectedClick,"A READY ticket should have an Open button");
 for(let i=0;i<55;i++){if(await evaluate(cdp,'Boolean(document.querySelector(".mobi-live02-case-detail .mobi-live02-settlement form"))'))break;await sleep(150);}
 assert(await evaluate(cdp,'Boolean(document.querySelector(".mobi-live02-case-detail .mobi-live02-settlement form"))'),"Cash form must appear only inside the selected detail panel");
 assert(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody form").length===0'),"Cash form leaked into repair list table");
 await capture(cdp,"c-live-02-vp03-desktop-opened-case");
 await evaluate(cdp,'document.querySelector(".mobi-live02-case-detail button.mobi-live02-close").click();true');
 assert(!(await evaluate(cdp,'Boolean(document.querySelector(".mobi-live02-case-detail"))')),"Closing details should hide panel without changing a ticket");
"""
src=src.replace(needle,needle+"\n"+added,1)
needle2=' await capture(cdp,"c-live-02-vp03-table-mobile");'
assert src.count(needle2)==1
added2="""
 const mobileButton=await evaluate(cdp,'(() => {const ready=[...document.querySelectorAll(".mobi-live02-orders tbody tr")].find(row=>row.querySelector(".mobi-live02-status-ready"));if(!ready)return false;ready.querySelector(".mobi-live02-open")?.click();return true;})()');
 assert(mobileButton,"Mobile READY card not clickable");
 for(let i=0;i<60;i++){if(await evaluate(cdp,'Boolean(document.querySelector(".mobi-live02-case-detail .mobi-live02-settlement form"))'))break;await sleep(150);}
 assert(await evaluate(cdp,'Boolean(document.querySelector(".mobi-live02-case-detail .mobi-live02-settlement form"))'),"Mobile case panel missing settlement form");
 const mobileSelected=await evaluate(cdp,'({width:innerWidth,overflow:document.documentElement.scrollWidth,inlineForms:document.querySelectorAll(".mobi-live02-orders tbody form").length})');
 assert(mobileSelected.inlineForms===0 && mobileSelected.overflow<=mobileSelected.width+2,"Mobile selected case overflow or inline form "+JSON.stringify(mobileSelected));
 await capture(cdp,"c-live-02-vp03-mobile-opened-case");
 console.log("C_LIVE_02_VP03_CASE_PANEL_PASS",JSON.stringify({desktopRows:desktop.rowCount,mobileRows:mobile.rowCount,tableForms:rowForms,mobileSelected}));
"""
src=src.replace(needle2,needle2+"\n"+added2,1)
(r/"c-live-02-vp03-browser.mjs").write_text(src,encoding="utf8",newline="\n")
print("VP03_BROWSER_TEST_READY")
