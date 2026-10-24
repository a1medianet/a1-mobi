from pathlib import Path
root=Path(r"C:\A1Hub\a1-mobi")
p=root/"src/app/[locale]/repairs/page.tsx"
s=p.read_text(encoding="utf-8")
key='<p className="preview-notice">{t.notice}</p>'
assert s.count(key)==1,s.count(key)
addition='''<p className="preview-notice">{t.notice}</p>
 {process.env.A1_MOBI_C_LIVE_02_ENABLED==="1" && <p><Link className="primary mobi-live-entry" href={"/"+locale+"/live-02"}>{ar?"فتح إدارة طلبات الصيانة الفعلية":"Open repair orders"}</Link></p>}'''
p.write_text(s.replace(key,addition),encoding="utf-8",newline="\n")
print("REPAIRS_ENTRY_ENABLED_ONLY_BY_LOCAL_PILOT_GATE")
