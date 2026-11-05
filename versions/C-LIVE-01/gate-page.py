from pathlib import Path
r=Path(r"C:\A1Hub\a1-mobi")
page=r/"src/app/[locale]/live-01/page.tsx"
component=r/"src/components/live-operations.tsx"
assert page.exists() and not component.exists()
component.write_text(page.read_text(encoding="utf8"),encoding="utf8",newline="\n")
page.write_text('''import { notFound } from "next/navigation";
import LiveOperationsPage from "@/components/live-operations";
export const dynamic = "force-dynamic";
export default function Page() {
  if (process.env.A1_MOBI_C_LIVE_01_ENABLED !== "1") notFound();
  return <LiveOperationsPage />;
}
''',encoding="utf8",newline="\n")
p=r/"src/app/[locale]/inventory/page.tsx"
s=p.read_text(encoding="utf8")
start='<p><Link className="primary mobi-live-entry"'
assert s.count(start)==1
s=s.replace(start,'{process.env.A1_MOBI_C_LIVE_01_ENABLED==="1" && <p><Link className="primary mobi-live-entry"',1)
needle='{"Real operation: Product → IMEI → Invoice"}</Link></p>'
# JSX before has locale ternary, not this literal; close </p> after link via exact
linkline=[line for line in s.splitlines() if "mobi-live-entry" in line][0]
assert linkline.count('</Link></p>')==1
s=s.replace(linkline,linkline.replace('</Link></p>','</Link></p>}'),1)
p.write_text(s,encoding="utf8",newline="\n")
p=r/"src/app/[locale]/pos/page.tsx"
s=p.read_text(encoding="utf8")
assert 'import { useMemo, useState }' in s
s=s.replace('import { useMemo, useState }','import { useEffect, useMemo, useState }',1)
needle='  const [query,setQuery] = useState("");'
assert s.count(needle)==1
s=s.replace(needle,'''  const [liveEnabled,setLiveEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/ops/live-01", {cache:"no-store"}).then(response => {
      if(active) setLiveEnabled(response.ok);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
'''+needle,1)
line=[line for line in s.splitlines() if "mobi-live-entry" in line][0]
assert line.count("<p><Link")==1 and line.count("</Link></p>")==1
s=s.replace(line,line.replace("<p><Link","{liveEnabled && <p><Link").replace("</Link></p>","</Link></p>}"),1)
p.write_text(s,encoding="utf8",newline="\n")
print("PILOT UI GATED, PAGE SERVER PROTECTED AND POS LINK RESTRICTED")
