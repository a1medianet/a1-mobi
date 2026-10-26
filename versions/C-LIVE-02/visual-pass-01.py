from pathlib import Path
r=Path(r"C:\A1Hub\a1-mobi")
p=r/"src/components/repair-live-operations.tsx"
s=p.read_text(encoding="utf8")
start=s.index('  {!loading&&<section className="mobi-live02-cash">')
end=s.index('  <section className="mobi-live02-forms">',start)
cash=s[start:end]
assert '<h2>{cashOpen?t.cashOpen:t.cashClosed}</h2>' in cash
cash=cash.replace('<section className="mobi-live02-cash">','<details className="mobi-live02-cash">')
cash=cash.replace('<h2>{cashOpen?t.cashOpen:t.cashClosed}</h2>','<summary><span className="mobi-live02-cash-marker">●</span>{cashOpen?t.cashOpen:t.cashClosed}</summary>')
cash=cash.replace('</section>','</details>')
s=s[:start]+s[end:]
target='  <section className="activity-card">'
assert s.count(target)==1
s=s.replace(target,cash+target,1)
# Real-time, factual step counters. No artificial values.
needle='  <section className="mobi-live02-forms">'
assert s.count(needle)==1
summary='''  <nav className="mobi-live02-flow" aria-label={locale==="ar"?"خطوات العمل":"Repair process"}>
   <span><b>01</b>{locale==="ar"?"الاستلام":"Receive"}</span>
   <span><b>02</b>{locale==="ar"?"التشخيص":"Diagnose"}</span>
   <span><b>03</b>{locale==="ar"?"الإصلاح":"Repair"}</span>
   <span><b>04</b>{locale==="ar"?"التحصيل والتسليم":"Collect & deliver"}</span>
  </nav>
  <section className="mobi-live02-forms">'''
s=s.replace(needle,summary,1)
p.write_text(s,encoding="utf8",newline="\n")
print("C-LIVE-02 UI: INTAKE BEFORE COLLAPSIBLE CASH; WORKFLOW NAV")
