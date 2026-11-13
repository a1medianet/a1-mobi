from pathlib import Path
r=Path(r"C:\A1Hub\a1-mobi")
p=r/"src/components/repair-live-operations.tsx"
s=p.read_text(encoding="utf8")
a='''    if(active)acceptPage(data);'''
b='''    if(active){acceptPage(data);setMessage("");}'''
assert s.count(a)==1
s=s.replace(a,b)
p.write_text(s,encoding="utf8",newline="\n")
x=r/"versions/C-LIVE-02/c-live-02-vp04-browser.mjs"
s=x.read_text(encoding="utf8")
a=''' await sleep(200);
 const searched=await evaluate(cdp,'''
b=''' for(let i=0;i<65;i++){
   if(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody tr").length===1 && document.querySelector(".mobi-live02-orders tbody")?.innerText.includes("Customer B")'))break;
   await sleep(220);
 }
 const searched=await evaluate(cdp,'''
assert s.count(a)==1
s=s.replace(a,b)
a=''' await sleep(200);
 const filtered=await evaluate(cdp,'''
b=''' for(let i=0;i<65;i++){
   if(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-orders tbody tr").length===1 && document.querySelector(".mobi-live02-orders tbody")?.innerText.includes("جاهز")'))break;
   await sleep(220);
 }
 const filtered=await evaluate(cdp,'''
assert s.count(a)==1
s=s.replace(a,b)
x.write_text(s,encoding="utf8",newline="\n")
print("SERVER_SEARCH_BROWSER_AWAIT_FIXED")
