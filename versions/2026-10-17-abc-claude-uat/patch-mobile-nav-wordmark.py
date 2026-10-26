from pathlib import Path
r=Path(r"C:\A1Hub\a1-mobi")
v=r/"versions"/"2026-10-17-abc-claude-uat"
css=r/"src"/"app"/"globals.css"
s=css.read_text(encoding="utf-8")
assert "A1 MOBI 20261017 WORDMARK AND MOBILE NAV" not in s
css.write_text(s+'''
/* A1 MOBI 20261017 WORDMARK AND MOBILE NAV — checked against true 390px CDP viewport. */
.product-brand>.mobi-wordmark{display:inline-flex;align-items:center;width:auto;height:auto;border-radius:0;background:transparent;box-shadow:none;color:#14233d;white-space:nowrap;font-size:23px;gap:7px}
.product-brand>.mobi-wordmark.footer-wordmark{font-size:23px}
.mobi-marketing-a .mobi-headline-orange{display:inline-block}
@media(max-width:640px){
 .product-brand>.mobi-wordmark{font-size:20px;gap:5px}
 .mobi-store-header nav:not(.is-open){display:none}
 .mobi-store-header nav.is-open{display:flex;flex-wrap:wrap;justify-content:flex-start;z-index:65;box-shadow:0 13px 30px #14233d20}
}
''',encoding="utf-8",newline="\n")
q=r/"scripts"/"abc-browser-qa.mjs"
s=q.read_text(encoding="utf-8")
needle='  assert(await evaluate(cdp, \'getComputedStyle(document.querySelector(".mobi-store-header-search input")).opacity === "1"\'), "B mobile search must be visible");'
assert s.count(needle)==1
insert='''  assert(await evaluate(cdp, 'getComputedStyle(document.querySelector(".mobi-store-header nav")).display === "none"'), "B mobile nav must be collapsed initially");
  await evaluate(cdp, 'document.querySelector(".mobi-store-menu-button").click(); true');
  await sleep(100);
  assert(await evaluate(cdp, 'getComputedStyle(document.querySelector(".mobi-store-header nav")).display !== "none"'), "B mobile menu must open");
  await evaluate(cdp, 'document.querySelector(".mobi-store-menu-button").click(); true');
  await sleep(100);
  assert(await evaluate(cdp, 'getComputedStyle(document.querySelector(".mobi-store-header nav")).display === "none"'), "B mobile menu must close");'''
q.write_text(s.replace(needle,needle+"\n"+insert,1),encoding="utf-8",newline="\n")
print("CSS wordmark and mobile navigation updated; CDP assertions added")
