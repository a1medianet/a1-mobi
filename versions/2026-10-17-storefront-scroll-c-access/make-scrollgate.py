from pathlib import Path
r=Path(r"C:\A1Hub\a1-mobi")
v=r/"versions"/"2026-10-17-storefront-scroll-c-access"
p=r/"versions"/"2026-10-17-abc-claude-uat"/"abc-browser-a-b-only.mjs"
s=p.read_text(encoding="utf-8")
assert 'bViewport.scrollHeight <= bViewport.innerHeight' in s
assert 'document.querySelectorAll(".mobi-store-product").length === 4' in s
s=s.replace('bViewport.scrollHeight <= bViewport.innerHeight','bViewport.scrollHeight >= bViewport.innerHeight * 2')
s=s.replace('"B exceeds 1440x900 viewport:', '"B must support full merchant page vertical scroll:')
s=s.replace('document.querySelectorAll(".mobi-store-product").length === 4','document.querySelectorAll(".mobi-store-product").length >= 8')
s=s.replace('B must render four featured products','B must render at least eight merchant products')
s=s.replace('C:/A1Hub/a1-mobi/versions/2026-10-17-abc-claude-uat','C:/A1Hub/a1-mobi/versions/2026-10-17-storefront-scroll-c-access')
s=s.replace('a-desktop-cdp','a-desktop-scrollgate').replace('a-mobile-cdp','a-mobile-scrollgate').replace('b-desktop-cdp','b-desktop-scrollgate').replace('b-mobile-cdp','b-mobile-scrollgate')
s=s.replace('chrome-profile-cdp','chrome-profile-scrollgate')
check='  console.log("ABC_VISUAL_METRICS"'
assert check in s
s=s.replace(check,'''  assert(await evaluate(cdp, 'document.querySelectorAll(".mobi-store-faq-list details").length === 3'), "B storefront FAQ not found");
  assert(await evaluate(cdp, '["services","about-store","store-contact"].every(id=>!!document.getElementById(id))'), "Merchant sections missing");
'''+check,1)
(v/"abc-storefront-scrollgate.mjs").write_text(s,encoding="utf-8",newline="\n")
print("CREATED B SCROLLING BROWSER GATE")
