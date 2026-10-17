from pathlib import Path
r=Path(r"C:\A1Hub\a1-mobi")
p=r/"src/components/repair-live-operations.tsx"
s=p.read_text(encoding="utf8")
def replace(a,b):
 global s
 n=s.count(a)
 if n!=1:raise ValueError(f"Match {n} {a[:60]}")
 s=s.replace(a,b,1)
replace('<span><b>01</b>{locale==="ar"?"الاستلام":"Receive"}</span>',
        '<a href="#mobi-repair-intake"><b>01</b>{locale==="ar"?"الاستلام":"Receive"}</a>')
replace('<span><b>02</b>{locale==="ar"?"التشخيص":"Diagnose"}</span>',
        '<a href="#mobi-repair-diagnosis"><b>02</b>{locale==="ar"?"التشخيص":"Diagnose"}</a>')
replace('<span><b>03</b>{locale==="ar"?"الإصلاح":"Repair"}</span>',
        '<a href="#mobi-repair-orders"><b>03</b>{locale==="ar"?"الإصلاح":"Repair"}</a>')
replace('<span><b>04</b>{locale==="ar"?"التحصيل والتسليم":"Collect & deliver"}</span>',
        '<a href="#mobi-repair-cash"><b>04</b>{locale==="ar"?"التحصيل والتسليم":"Collect & deliver"}</a>')
replace('   <form onSubmit={event=>{\n    event.preventDefault();\n    void send({action:"intake",',
        '   <form id="mobi-repair-intake" onSubmit={event=>{\n    event.preventDefault();\n    void send({action:"intake",')
replace('   <form onSubmit={event=>{\n    event.preventDefault();\n    if(!selected)return;',
        '   <form id="mobi-repair-diagnosis" onSubmit={event=>{\n    event.preventDefault();\n    if(!selected)return;')
replace('  {!loading&&<details className="mobi-live02-cash">',
        '  {!loading&&<details id="mobi-repair-cash" className="mobi-live02-cash">')
replace('  <section className="activity-card"><div className="section-head">',
        '  <section id="mobi-repair-orders" className="activity-card"><div className="section-head">')
p.write_text(s,encoding="utf8",newline="\n")
css=r/"src/app/globals.css"
c=css.read_text(encoding="utf8")
assert '.mobi-live02-flow span{' in c
assert '.mobi-live02-flow span:nth-child(even) b' in c
c=c.replace('.mobi-live02-flow span{','.mobi-live02-flow a{')
c=c.replace('.mobi-live02-flow span:nth-child(even) b','.mobi-live02-flow a:nth-child(even) b')
c=c.replace('.mobi-live02-flow span{font-size:11px;','.mobi-live02-flow a{font-size:11px;')
c=c.replace('.mobi-live02-flow span{min-height:43px}', '.mobi-live02-flow a{min-height:43px}')
marker='/* C-LIVE-02 step navigation accessibility */'
if marker not in c:
 c+=f'\n{marker}\n.mobi-live02-flow a{{text-decoration:none;color:#273d5f;cursor:pointer}}\n.mobi-live02-flow a:hover,.mobi-live02-flow a:focus-visible{{background:#eaf2ff;border-color:#1265e8;outline-offset:2px}}\n.mobi-live02 #mobi-repair-intake,.mobi-live02 #mobi-repair-diagnosis,.mobi-live02 #mobi-repair-orders,.mobi-live02 #mobi-repair-cash{{scroll-margin-top:90px}}\n'
css.write_text(c,encoding="utf8",newline="\n")
print("VISUAL_PASS_01_CLICKABLE_STEP_NAV_READY")
