from pathlib import Path
root=Path(r"C:\A1Hub\a1-mobi")
v=root/"versions"/"C-LIVE-02"
s=(root/"versions"/"C-LIVE-01"/"c-live-01-browser-gate.mjs").read_text(encoding="utf8")
s=s.replace('const outputDir = "C:/A1Hub/a1-mobi/versions/C-LIVE-01";','const outputDir = "C:/A1Hub/a1-mobi/versions/C-LIVE-02";')
s=s.replace('--user-data-dir=C:/A1Hub/a1-mobi/versions/C-LIVE-01/chrome-cdp-profile','--user-data-dir=C:/A1Hub/a1-mobi/versions/C-LIVE-02/chrome-cdp-profile')
needle='  await capture(cdp, "c-dashboard-authenticated-desktop");'
assert s.count(needle)==1
addon="""
  await navigate(cdp,base+"/ar/live-02",1440,900);
  for(let i=0;i<75;i++){
    if(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-forms form").length===2'))break;
    await sleep(200);
  }
  assert(await evaluate(cdp,'location.pathname==="/ar/live-02"'),"C-LIVE-02 redirect");
  assert(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-forms form").length===2'),"C-LIVE-02 intake/estimate forms absent");
  await capture(cdp,"c-live-02-desktop");
  const desk=await evaluate(cdp,'({width:window.innerWidth,scroll:document.documentElement.scrollWidth})');
  assert(desk.scroll<=desk.width+2,"C-LIVE-02 desktop overflow "+JSON.stringify(desk));
  await navigate(cdp,base+"/ar/live-02",390,844);
  for(let i=0;i<75;i++){
    if(await evaluate(cdp,'document.querySelectorAll(".mobi-live02-forms form").length===2'))break;
    await sleep(200);
  }
  const mobi=await evaluate(cdp,'({width:window.innerWidth,scroll:document.documentElement.scrollWidth,forms:document.querySelectorAll(".mobi-live02-forms form").length})');
  assert(mobi.forms===2 && mobi.scroll<=mobi.width+2,"C-LIVE-02 mobile overflow "+JSON.stringify(mobi));
  await capture(cdp,"c-live-02-mobile");
  console.log("C_LIVE_02_VISUAL_GATE_PASS",JSON.stringify({desktop:desk,mobile:mobi}));
"""
s=s.replace(needle,needle+"\n"+addon,1)
(v/"c-live-02-browser-gate.mjs").write_text(s,encoding="utf8",newline="\n")
print("VISUAL_SCRIPT_READY")
