from pathlib import Path
r=Path(r"C:\A1Hub\a1-mobi")
api=r/"src/app/api/ops/live-02/route.ts"
s=api.read_text(encoding="utf8")
assert s.count("export async function GET(request?:Request)")==1
s=s.replace("export async function GET(request?:Request)","export async function GET(request:Request)")
s=s.replace('request?.url??"http://127.0.0.1/api/ops/live-02"',"request.url")
api.write_text(s,encoding="utf8",newline="\n")
test=r/"tests/c-live-02-route-db.test.ts"
s=test.read_text(encoding="utf8")
n=s.count("route.GET()")
assert n>0,n
s=s.replace("route.GET()", 'route.GET(new Request(base+"/api/ops/live-02"))')
test.write_text(s,encoding="utf8",newline="\n")
print("NEXT_HANDLER_TYPE_FIXED",n,"TEST_CALL_SITES")
