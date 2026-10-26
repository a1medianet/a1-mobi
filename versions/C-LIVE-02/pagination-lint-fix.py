from pathlib import Path
p=Path(r"C:\A1Hub\a1-mobi\src\components\repair-live-operations.tsx")
s=p.read_text(encoding="utf8")
a=''' function queryUrl(){
  const params=new URLSearchParams({page:String(page),status:statusFilter});
  if(search.trim())params.set("q",search.trim());
  return "/api/ops/live-02?"+params.toString();
 }'''
b=''' const listParams=new URLSearchParams({page:String(page),status:statusFilter});
 if(search.trim())listParams.set("q",search.trim());
 const queryUrl="/api/ops/live-02?"+listParams.toString();'''
assert s.count(a)==1
s=s.replace(a,b)
assert s.count('queryUrl()')==2
s=s.replace('queryUrl()','queryUrl')
assert s.count('},[search,statusFilter,page]);')==1
s=s.replace('},[search,statusFilter,page]);','},[queryUrl]);')
p.write_text(s,encoding="utf8",newline="\n")
print("ESLINT_QUERY_DEPENDENCY_RESOLVED")
