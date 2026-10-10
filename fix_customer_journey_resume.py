from pathlib import Path
p=Path(__file__).with_name("fix_customer_journey_20261008.py")
source=p.read_text(encoding="utf8")
header=source[:source.index('change("src/app/product/[locale]/page.tsx",[')]
remaining=source[source.index('change("src/app/[locale]/page.tsx",['):]
header=header.replace("if n!=1:","if n<1:")
exec(compile(header+remaining,str(p),"exec"))
