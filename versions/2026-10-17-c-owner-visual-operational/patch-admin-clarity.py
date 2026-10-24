from pathlib import Path
r=Path(r"C:\A1Hub\a1-mobi")
def change(rel,a,b):
 p=r/rel
 text=p.read_text(encoding="utf-8")
 if a in text:
  if text.count(a)!=1:raise RuntimeError(f"AMBIGUOUS {rel} x{text.count(a)}")
  p.write_text(text.replace(a,b,1),encoding="utf-8",newline="\n")
  print("UPDATED",rel)
 elif b in text:print("ALREADY_DONE",rel)
 else:raise RuntimeError(f"NOT FOUND {rel} key={a[:42]!r}")
change("src/app/[locale]/page.tsx",'title: "صباح العمل من مكان واحد",','title: "إدارة متجرك من مكان واحد",')
p="src/app/[locale]/admin/page.tsx"
change(p,'readiness:"جاهزية النظام", auth:', 'readiness:"حالة القدرات التجريبية", demoStatus:"تجريبي", auth:')
change(p,'readiness:"System readiness", auth:', 'readiness:"Pilot capability status", demoStatus:"DEMO", auth:')
change(p,'[t.auth,t.pass,"done"],[t.control,t.pass,"done"],[t.abuse,t.pass,"done"],[t.ops,t.pass,"done"],','[t.auth,t.demoStatus,"pending"],[t.control,t.demoStatus,"pending"],[t.abuse,t.demoStatus,"pending"],[t.ops,t.demoStatus,"pending"],')
p="versions/2026-10-17-c-owner-visual-operational/c-owner-browser-qa.mjs"
change(p,'    await capture(cdp,"c-"+key+"-desktop");','''    if(key==="point-of-sale"){
      const photoState=await evaluate(cdp, 'Promise.all([...document.querySelectorAll(".product-card img")].slice(0,4).map(async img=>{try{await img.decode()}catch{};return {src:img.currentSrc.split("/").slice(-1)[0],complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight}}))');
      console.log("POS_IMAGE_DECODE_AUDIT",JSON.stringify(photoState));
      assert(photoState.some(row=>row.naturalWidth>0),"POS all product images failed to decode");
    }
    await capture(cdp,"c-"+key+"-desktop");''')
print("C_ADMIN_CLARITY_PATCH_COMPLETE")
