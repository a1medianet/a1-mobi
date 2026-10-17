from pathlib import Path
r=Path(r"C:\A1Hub\a1-mobi")
f=r/"src/app/api/ops/live-01/route.ts"
s=f.read_text(encoding="utf-8")
for a,b in [
 ('export async function GET() {\n  try {','export async function GET() {\n  if (process.env.A1_MOBI_C_LIVE_01_ENABLED !== "1") return authJson({ error: "NOT_FOUND" }, 404);\n  try {'),
 ('export async function POST(request: Request) {\n  if (!sameOriginMutation(request))','export async function POST(request: Request) {\n  if (process.env.A1_MOBI_C_LIVE_01_ENABLED !== "1") return authJson({ error: "NOT_FOUND" }, 404);\n  if (!sameOriginMutation(request))')
]:
 assert s.count(a)==1,(a,s.count(a))
 s=s.replace(a,b,1)
f.write_text(s,encoding="utf-8",newline="\n")
env=r/".env.local"
text=env.read_text(encoding="utf-8")
if "A1_MOBI_C_LIVE_01_ENABLED" not in text:
 env.write_text(text.rstrip("\n")+"\n# Isolated Thaghr UAT only; disabled by default everywhere else.\nA1_MOBI_C_LIVE_01_ENABLED=1\n",encoding="utf-8")
print("SERVER_LIVE_GATE_ACTIVE_IN_LOCAL_UAT_ONLY")
