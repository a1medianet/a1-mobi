from pathlib import Path
r=Path(r"C:\A1Hub\a1-mobi\versions\C-LIVE-02")
s=(r/"c-live-02-financial-browser-e2e.mjs").read_text(encoding="utf8")
for a,b in [
 ("9226","9228"),
 ("chrome-fin-uat-cdp","chrome-fin-uat-vp03-cdp"),
 ("[UAT-FIN-02] Browser Settlement","[UAT-FIN-03] Selected Workspace Settlement"),
 ('"86000000100123"','"86000000100124"'),
 ("c-live-02-financial-partial-payment","c-live-02-vp03-financial-partial-payment"),
 ("c-live-02-financial-paid-in-full","c-live-02-vp03-financial-paid-in-full"),
 ("c-live-02-financial-delivered-warranty","c-live-02-vp03-financial-delivered-warranty"),
 ("C_LIVE_02_FINANCIAL_BROWSER_E2E_PASS","C_LIVE_02_VP03_FINANCIAL_BROWSER_E2E_PASS")
]:s=s.replace(a,b)
a=""" await evaluate(cdp,'window.confirm=()=>true;true');"""
b=""" await evaluate(cdp,'window.confirm=()=>true;true');
 await evaluate(cdp,'(() => {const row=' + rowFn + ';row.querySelector(".mobi-live02-open")?.click();return true;})()');
 for(let i=0;i<70;i++){if(await evaluate(cdp,'Boolean(document.querySelector(".mobi-live02-case-detail .mobi-live02-settlement form"))'))break;await sleep(200);}
 assert(await evaluate(cdp,'Boolean(document.querySelector(".mobi-live02-case-detail .mobi-live02-settlement form"))'),"Selected case payment form not visible");
 assert(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody form").length===0'),"Payment form embedded inside a list row");"""
assert s.count(a)==1
s=s.replace(a,b)
s=s.replace('row.querySelector(".mobi-live02-settlement input[type=number]")','document.querySelector(".mobi-live02-case-detail .mobi-live02-settlement input[type=number]")')
s=s.replace('row.querySelector(".mobi-live02-settlement form")','document.querySelector(".mobi-live02-case-detail .mobi-live02-settlement form")')
# Preserve JavaScript quote escaping in expressions.
s=s.replace('row.querySelector(\\".mobi-live02-settlement input[type=number]\\")','document.querySelector(\\".mobi-live02-case-detail .mobi-live02-settlement input[type=number]\\")')
s=s.replace('row.querySelector(\\".mobi-live02-settlement form\\")','document.querySelector(\\".mobi-live02-case-detail .mobi-live02-settlement form\\")')
s=s.replace("""'('+rowFn+')?.textContent.includes("60.00")'""", """'document.querySelector(".mobi-live02-case-detail")?.textContent.includes("60.00")'""")
s=s.replace("""'('+rowFn+')?.textContent.includes("تم تسديد القيمة")'""", """'document.querySelector(".mobi-live02-case-detail")?.textContent.includes("تم تسديد القيمة")'""")
anchor=""" await navigate(cdp,ownerUrl,1440,900);
 await waitUntil('('+rowFn+')?.textContent.includes("تم التسليم")');"""
replace=""" await navigate(cdp,ownerUrl,1440,900);
 await waitUntil('('+rowFn+')?.textContent.includes("تم التسليم")');
 await evaluate(cdp,'(() => {const row=' + rowFn + ';row.querySelector(".mobi-live02-open")?.click();return true;})()');
 await waitUntil('document.querySelector(".mobi-live02-case-detail .mobi-live02-settlement")?.textContent.includes("الضمان")');
 assert(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody form").length===0'),"Delivered state leaked row form");"""
assert s.count(anchor)==1
s=s.replace(anchor,replace)
assert "selected-case" not in s or True
out=r/"c-live-02-vp03-financial-e2e.mjs"
out.write_text(s,encoding="utf8",newline="\n")
print("VP03_FINANCIAL_GATE_READY",out.name,len(s))
