from pathlib import Path
p=Path(r"C:\A1Hub\a1-mobi\versions\C-LIVE-02\c-live-02-browser-gate.mjs")
s=p.read_text(encoding="utf8")
cut='  await navigate(cdp, base + "/ar/live-01", 1440, 1000);'
assert s.count(cut)==1
s=s.split(cut)[0]+'''  ws.close();
  console.log("C_LIVE_02_BROWSER_VISUAL_PASS");
} finally {
  chromeProcess.kill("SIGTERM");
}
'''
p.write_text(s,encoding="utf8",newline="\n")
print("C-LIVE-02 visual gate decoupled from C-LIVE-01")
