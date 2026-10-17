from pathlib import Path
root=Path(r"C:\A1Hub\a1-mobi")
folder=root/"versions"/"C-LIVE-01"
s=(root/"scripts"/"abc-browser-qa.mjs").read_text(encoding="utf-8")
s=s.replace('--user-data-dir=/tmp/a1-mobi-abc-cdp','--user-data-dir=C:/A1Hub/a1-mobi/versions/C-LIVE-01/chrome-cdp-profile')
s=s.replace('const outputDir = process.env.ABC_VISUAL_DIR || "artifacts/pilot";','const outputDir = "C:/A1Hub/a1-mobi/versions/C-LIVE-01";')
needle='  await capture(cdp, "c-dashboard-authenticated-desktop");'
assert s.count(needle)==1
addon="""
  await navigate(cdp, base + "/ar/live-01", 1440, 1000);
  await sleep(750);
  assert(await evaluate(cdp,'location.pathname==="/ar/live-01"'),"C-LIVE pilot route redirected unexpectedly");
  assert(await evaluate(cdp,'document.querySelectorAll(".mobi-live-steps form").length===3'),"C-LIVE operations forms missing");
  assert(await evaluate(cdp,'document.querySelector(".mobi-live-stats") !== null'),"C-LIVE database view missing");
  await capture(cdp,"c-live-01-desktop");
  const desktop=await evaluate(cdp,'({width:window.innerWidth,scroll:document.documentElement.scrollWidth,forms:document.querySelectorAll(".mobi-live-steps form").length})');
  assert(desktop.scroll<=desktop.width+2,"C-LIVE desktop horizontal overflow");
  await navigate(cdp,base+"/ar/live-01",390,844);
  await sleep(750);
  const mobile=await evaluate(cdp,'({width:window.innerWidth,scroll:document.documentElement.scrollWidth,forms:document.querySelectorAll(".mobi-live-steps form").length})');
  assert(mobile.forms===3 && mobile.scroll<=mobile.width+2,"C-LIVE mobile layout gate failed: "+JSON.stringify(mobile));
  await capture(cdp,"c-live-01-mobile");
  console.log("C_LIVE_01_VISUAL_BROWSER_PASS",JSON.stringify({desktop,mobile}));
"""
s=s.replace(needle,needle+"\n"+addon,1)
(folder/"c-live-01-browser-gate.mjs").write_text(s,encoding="utf-8",newline="\n")
print("C_LIVE_01_BROWSER_GATE_CREATED")
