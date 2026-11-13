from pathlib import Path
r=Path(r"C:\A1Hub\a1-mobi")
v=r/"versions"/"2026-10-17-abc-claude-uat"
s=(r/"scripts"/"abc-browser-qa.mjs").read_text(encoding="utf-8")
needle='  const suffix = Date.now().toString();'
assert s.count(needle)==1
s=s.split(needle)[0]
s=s.replace('const base = process.env.APP_ORIGIN || "http://127.0.0.1:3185";','const base = process.env.APP_ORIGIN || "http://localhost:3185";')
s=s.replace('const chrome = process.env.CHROME_BIN;','const chrome = process.env.CHROME_BIN || "C:/Program Files/Google/Chrome/Application/chrome.exe";')
s=s.replace('if (!secret || secret.length < 32) throw new Error("A1_MOBI_BOOTSTRAP_SECRET is required");','')
s=s.replace('const outputDir = process.env.ABC_VISUAL_DIR || "artifacts/pilot";','const outputDir = "C:/A1Hub/a1-mobi/versions/2026-10-17-abc-claude-uat";')
assert '--user-data-dir=/tmp/a1-mobi-abc-cdp' in s
s=s.replace('--user-data-dir=/tmp/a1-mobi-abc-cdp','--user-data-dir=C:/A1Hub/a1-mobi/versions/2026-10-17-abc-claude-uat/chrome-profile-cdp')
s=s.replace('  await navigate(cdp, base + "/product/ar", 1440, 900);','  await navigate(cdp, base + "/product/ar", 1440, 900);\n  await capture(cdp, "a-desktop-cdp");')
s=s.replace('  await navigate(cdp, base + "/store-preview", 1440, 900);','  await navigate(cdp, base + "/store-preview", 1440, 900);\n  await capture(cdp, "b-desktop-cdp");')
s=s.replace('  await navigate(cdp, base + "/product/ar", 390, 844);','  await navigate(cdp, base + "/product/ar", 390, 844);\n  await capture(cdp, "a-mobile-cdp");')
s=s.replace('  await navigate(cdp, base + "/store-preview", 390, 844);','  await navigate(cdp, base + "/store-preview", 390, 844);\n  await capture(cdp, "b-mobile-cdp");')
s+='''
  console.log("ABC_VISUAL_METRICS",JSON.stringify({
    aMobile,bMobile,bViewport,
    bDom:await evaluate(cdp, '({width:window.innerWidth,scroll:document.documentElement.scrollWidth,nav:getComputedStyle(document.querySelector(".mobi-store-header nav")).display})')
  }));
  ws.close();
} finally {
  chromeProcess.kill("SIGTERM");
}
'''
(v/"abc-browser-a-b-only.mjs").write_text(s,encoding="utf-8",newline="\n")
print("GENERATED ABC A/B viewport test",len(s))
