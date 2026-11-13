from pathlib import Path
p=Path(r"C:\A1Hub\a1-mobi\versions\C-LIVE-02\c-live-02-browser-gate.mjs")
s=p.read_text(encoding="utf8")
needle='  console.log("C_LIVE_02_VISUAL_GATE_PASS",JSON.stringify({desktop:desk,mobile:mobi}));'
assert s.count(needle)==1
s=s.replace(needle,'''  await navigate(cdp,base+"/en/live-02",1440,900);
  for(let i=0;i<75;i++){
    if(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-forms form").length===2'))break;
    await sleep(200);
  }
  assert(await evaluate(cdp,'document.querySelector("h1")?.textContent==="Repair orders"'),"English repair heading not localized");
  await capture(cdp,"c-live-02-english");
  console.log("C_LIVE_02_VISUAL_GATE_PASS",JSON.stringify({desktop:desk,mobile:mobi,english:true}));''')
p.write_text(s,encoding="utf8",newline="\n")
print("ADDED_ENGLISH_VISUAL_CHECK")
