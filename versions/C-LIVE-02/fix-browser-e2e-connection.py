from pathlib import Path
p=Path(r"C:\A1Hub\a1-mobi\versions\C-LIVE-02\c-live-02-browser-journey.mjs")
s=p.read_text(encoding="utf8")
old='''  ws.close();
  console.log("C_LIVE_02_BROWSER_VISUAL_PASS");

  await navigate(cdp,base+"/ar/live-02",1440,900);'''
new='''  console.log("C_LIVE_02_BROWSER_VISUAL_PASS");

  await navigate(cdp,base+"/ar/live-02",1440,900);'''
assert s.count(old)==1
s=s.replace(old,new)
old2='''  console.log("C_LIVE_02_BROWSER_REAL_ACTIONS_PASS",JSON.stringify({created:true,estimated:true,approved:true,started:true,ready:true,persistedAfterReload:true}));

} finally'''
new2='''  console.log("C_LIVE_02_BROWSER_REAL_ACTIONS_PASS",JSON.stringify({created:true,estimated:true,approved:true,started:true,ready:true,persistedAfterReload:true}));
  ws.close();
} finally'''
assert s.count(old2)==1
s=s.replace(old2,new2)
p.write_text(s,encoding="utf8",newline="\n")
print("REPAIRED_BROWSER_CONNECTION_LIFECYCLE")
