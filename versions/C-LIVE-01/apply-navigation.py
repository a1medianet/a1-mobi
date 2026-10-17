from pathlib import Path
r=Path(r"C:\A1Hub\a1-mobi")
def edit(rel,a,b):
 p=r/rel
 s=p.read_text(encoding="utf8")
 if s.count(a)!=1: raise RuntimeError(f"{rel}: {s.count(a)} matches")
 p.write_text(s.replace(a,b,1),encoding="utf8",newline="\n")
 print("LINKED",rel)
edit("src/app/[locale]/pos/page.tsx",'<p className="preview-notice" role="status">{t.preview}</p>','''<p className="preview-notice" role="status">{t.preview}</p>
    <p><Link className="primary mobi-live-entry" href={"/"+locale+"/live-01"}>{locale==="ar"?"فتح تشغيل المخزون والبيع الحقيقي (C-LIVE-01)":"Open real inventory and sales (C-LIVE-01)"}</Link></p>''')
edit("src/app/[locale]/inventory/page.tsx",'<p className="preview-notice">{t.notice}</p>','''<p className="preview-notice">{t.notice}</p>
 <p><Link className="primary mobi-live-entry" href={"/"+locale+"/live-01"}>{ar?"التشغيل الحقيقي: منتج ← IMEI ← فاتورة":"Real operation: Product → IMEI → Invoice"}</Link></p>''')
css=r/"src/app/globals.css"
s=css.read_text(encoding="utf8")
assert "A1 MOBI C-LIVE-01 OPERATIONS" not in s
s+="""

/* A1 MOBI C-LIVE-01 OPERATIONS — scoped pilot views; real writes protected by API. */
.mobi-live-entry{display:inline-flex;padding:12px 18px;border-radius:10px;text-decoration:none;align-items:center;min-height:44px}
.mobi-live01{padding-bottom:50px}
.mobi-live-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:20px 0}
.mobi-live-stats article{background:white;border:1px solid #dfebfa;border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:8px}
.mobi-live-stats span{font-size:13px;color:#66748b}.mobi-live-stats strong{font-size:29px;color:#1265e8}
.mobi-live-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin:24px 0}
.mobi-live-steps form,.mobi-live-details article{background:#fff;border:1px solid #dfebfa;border-radius:17px;padding:22px;box-shadow:0 10px 26px #0e2b4c08}
.mobi-live-steps form{display:flex;flex-direction:column;gap:13px;align-items:stretch}
.mobi-live-steps h2,.mobi-live-details h2{font-family:"Alexandria","IBM Plex Sans Arabic",sans-serif;font-size:17px;color:#14233d;margin:0 0 8px}
.mobi-live-steps label{font-size:12px;color:#50627a;font-weight:650;display:flex;flex-direction:column;gap:7px;min-width:0}
.mobi-live-steps :is(input,select){width:100%;min-width:0;min-height:40px;padding:7px 10px;border:1px solid #cad7e8;border-radius:8px;background:#fff;color:#14233d}
.mobi-live-steps :is(input,select):focus-visible{outline:2px solid #1265e8;outline-offset:2px}
.mobi-live-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.mobi-live-steps button.primary{padding:12px;min-height:44px;cursor:pointer;border-radius:9px}
.mobi-live-steps button:disabled{opacity:.5;cursor:not-allowed}
.mobi-live-hint{font-size:12px;color:#738199}
.mobi-live-message{background:#e9f4ff;border:1px solid #bfdbfa;color:#14477f;padding:12px 16px;border-radius:10px}
.mobi-live-details{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.mobi-live-details table{width:100%}
.mobi-live-details th,.mobi-live-details td{padding:10px;border-bottom:1px solid #eaf0f7;white-space:nowrap;font-size:12px;text-align:start}
@media(max-width:1050px){.mobi-live-steps{grid-template-columns:1fr 1fr}.mobi-live-steps form:first-child{grid-column:1/-1}}
@media(max-width:640px){.mobi-live-stats{gap:7px}.mobi-live-stats article{padding:12px}.mobi-live-stats strong{font-size:21px}.mobi-live-steps,.mobi-live-details{grid-template-columns:1fr}.mobi-live-steps form:first-child{grid-column:auto}.mobi-live-steps form{padding:15px}.mobi-live-details article{min-width:0;padding:12px}}
"""
css.write_text(s,encoding="utf8",newline="\n")
print("CSS_C_LIVE")
