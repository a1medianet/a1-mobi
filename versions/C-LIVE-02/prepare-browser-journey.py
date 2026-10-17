from pathlib import Path
p=Path(r"C:\A1Hub\a1-mobi\versions\C-LIVE-02\c-live-02-browser-gate.mjs")
s=p.read_text(encoding="utf8")
key='  console.log("C_LIVE_02_BROWSER_VISUAL_PASS");'
assert s.count(key)==1
addon="""
  await navigate(cdp,base+"/ar/live-02",1440,900);
  async function waitUi(js) {
    for(let i=0;i<100;i++){if(await evaluate(cdp,js))return;await sleep(200);}
    throw new Error("C-LIVE-02 action gate timeout: "+js);
  }
  await waitUi('document.querySelectorAll(".mobi-live02-forms form").length===2');
  const fill=(root, values)=>'(() => {const nodes=[...document.querySelector('+JSON.stringify(root)+').querySelectorAll("input")];'+
    'const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;'+
    'const vals='+JSON.stringify(values)+';vals.forEach((v,i)=>{setter.call(nodes[i],v);nodes[i].dispatchEvent(new Event("input",{bubbles:true}));});return nodes.length;})()';
  const values=["Visual Repair UAT Customer","+96170123456","Sample Samsung Phone","356938035643809","Light scratches","LCD broken"];
  assert(await evaluate(cdp,fill(".mobi-live02-forms form",values))===6,"Intake form fields changed");
  await sleep(220);
  await evaluate(cdp,'document.querySelectorAll(".mobi-live02-forms form")[0].requestSubmit();true');
  await waitUi('document.querySelector(".activity-card tbody")?.innerText.includes("Visual Repair UAT Customer")');
  await capture(cdp,"c-live-02-browser-intake");
  console.log("C_LIVE_02_BROWSER_INTAKE_PASS");
  await evaluate(cdp,'(() => {const el=document.querySelectorAll(".mobi-live02-forms form")[1].querySelector("select");const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set;setter.call(el,el.options[1].value);el.dispatchEvent(new Event("change",{bubbles:true}));return true;})()');
  await sleep(200);
  assert(await evaluate(cdp,fill(".mobi-live02-forms form:nth-child(2)",["Damaged display confirmed","120"]))===2,"Estimate form fields changed");
  await sleep(250);
  await evaluate(cdp,'document.querySelectorAll(".mobi-live02-forms form")[1].requestSubmit();true');
  await waitUi('document.querySelector(".activity-card tbody")?.innerText.includes("بانتظار الموافقة")');
  await evaluate(cdp,'[...document.querySelectorAll(".activity-card tbody button")].find(b=>b.textContent.includes("اعتماد"))?.click();true');
  await waitUi('document.querySelector(".activity-card tbody")?.innerText.includes("معتمد")');
  await evaluate(cdp,'[...document.querySelectorAll(".activity-card tbody button")].find(b=>b.textContent.includes("بدء الإصلاح"))?.click();true');
  await waitUi('document.querySelector(".activity-card tbody")?.innerText.includes("قيد الإصلاح")');
  await capture(cdp,"c-live-02-browser-active-repair");
  await evaluate(cdp,'document.querySelector(".mobi-live02-ready summary")?.click();true');
  await sleep(300);
  assert(await evaluate(cdp,fill(".mobi-live02-ready form",["120","20","5"]))===3,"Final repair form fields changed");
  await evaluate(cdp,'window.confirm=()=>true;true');
  await sleep(300);
  await evaluate(cdp,'document.querySelector(".mobi-live02-ready form")?.requestSubmit();true');
  await waitUi('document.querySelector(".activity-card tbody")?.innerText.includes("جاهز للتسليم")');
  await navigate(cdp,base+"/ar/live-02",1440,900);
  await waitUi('document.querySelector(".activity-card tbody")?.innerText.includes("جاهز للتسليم")');
  await capture(cdp,"c-live-02-browser-ready-reloaded");
  console.log("C_LIVE_02_BROWSER_REAL_ACTIONS_PASS",JSON.stringify({created:true,estimated:true,approved:true,started:true,ready:true,persistedAfterReload:true}));
"""
s=s.replace(key,key+"\n"+addon,1)
Path(r"C:\A1Hub\a1-mobi\versions\C-LIVE-02\c-live-02-browser-journey.mjs").write_text(s,encoding="utf8",newline="\n")
print("C_LIVE_02_CLICK_FLOW_PREPARED")
