from pathlib import Path
root=Path(r"C:\A1Hub\a1-mobi")
dst=root/"versions"/"2026-10-17-c-owner-visual-operational"
source=(root/"scripts/abc-browser-qa.mjs").read_text(encoding="utf-8")
source=source.replace('const chrome = process.env.CHROME_BIN;','const chrome = process.env.CHROME_BIN || "C:/Program Files/Google/Chrome/Application/chrome.exe";',1)
source=source.replace('const outputDir = process.env.ABC_VISUAL_DIR || "artifacts/pilot";','const outputDir = "C:/A1Hub/a1-mobi/versions/2026-10-17-c-owner-visual-operational";',1)
source=source.replace('--user-data-dir=/tmp/a1-mobi-abc-cdp','--user-data-dir=C:/A1Hub/a1-mobi/versions/2026-10-17-c-owner-visual-operational/chrome-profile-cdp',1)
needle='  await capture(cdp, "c-dashboard-authenticated-desktop");'
assert source.count(needle)==1
addition=r'''
  const cRoutes = [
    ["point-of-sale","/ar/pos"],
    ["products","/ar/products"],
    ["inventory","/ar/inventory"],
    ["repairs","/ar/repairs"],
    ["customers","/ar/customers"],
    ["cash","/ar/cash"],
    ["reports","/ar/reports"],
    ["admin","/ar/admin"],
    ["team","/ar/settings/team"],
  ];
  const cAudit=[];
  const cDesktop=await evaluate(cdp, '({scrollWidth:document.documentElement.scrollWidth, innerWidth:window.innerWidth,scrollHeight:document.documentElement.scrollHeight,innerHeight:window.innerHeight,actions:document.querySelectorAll(".mobi-c-action").length})');
  assert(cDesktop.scrollWidth <= cDesktop.innerWidth + 1, "C dashboard horizontal overflow: "+JSON.stringify(cDesktop));
  assert(cDesktop.actions===4,"C spotlight action tiles missing");
  for(const [key,path] of cRoutes){
    await navigate(cdp,base+path,1440,900);
    const state=await evaluate(cdp, '({path:location.pathname,innerWidth:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,title:document.title,bodyText:document.body.innerText.slice(0,400),selected:[...document.querySelectorAll(".nav-item[aria-current=page]")].map(a=>a.getAttribute("href"))})');
    assert(state.path === path,"C route navigated unexpectedly: "+path+" -> "+state.path);
    assert(state.scrollWidth <= state.innerWidth + 2,"C horizontal overflow "+path+" "+JSON.stringify(state));
    assert(state.selected.includes(path),"C sidebar current route not highlighted "+path);
    await capture(cdp,"c-"+key+"-desktop");
    cAudit.push({key,path,scrollWidth:state.scrollWidth,innerWidth:state.innerWidth,selected:state.selected});
  }
  await navigate(cdp,base+"/ar",390,844);
  const cMobile=await evaluate(cdp,'({path:location.pathname,innerWidth:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,mobileNavVisible:getComputedStyle(document.querySelector(".mobile-nav")).display !== "none",mainHeading:document.querySelector("h1")?.textContent,sidebarVisible:getComputedStyle(document.querySelector(".sidebar")).display !== "none"})');
  assert(cMobile.path === "/ar","C mobile authenticated dashboard redirect");
  assert(cMobile.scrollWidth <= cMobile.innerWidth + 2,"C mobile horizontal overflow "+JSON.stringify(cMobile));
  assert(cMobile.mobileNavVisible,"C mobile navigation absent");
  assert(!cMobile.sidebarVisible,"C desktop sidebar unexpectedly occupies mobile");
  await capture(cdp,"c-dashboard-mobile");
  console.log("A1_MOBI_C_VISUAL_OPERATIONAL_PASS",JSON.stringify({cDesktop,cMobile,cAudit}));
'''
source=source.replace(needle,needle+"\n"+addition,1)
dst.joinpath("c-owner-browser-qa.mjs").write_text(source,encoding="utf-8",newline="\n")
print("C_BROWSER_GATE_GENERATED",len(source))
