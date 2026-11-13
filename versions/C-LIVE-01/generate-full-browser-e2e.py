from pathlib import Path
r=Path(r"C:\A1Hub\a1-mobi")
v=r/"versions"/"C-LIVE-01"
s=(v/"c-live-01-browser-gate.mjs").read_text(encoding="utf8")
anchor='  await capture(cdp,"c-live-01-desktop");'
assert s.count(anchor)==1
addon="""
  async function waitUi(js) {
    for(let i=0;i<80;i++){if(await evaluate(cdp,js))return;await sleep(200);}
    throw new Error("C-LIVE-01 UI did not reach expected state: "+js);
  }
  const sku="CUI-"+suffix;
  const values=["TESTBRAND","Phone Model","256GB",sku,"هاتف تجربة حقيقي","Browser Journey Phone","300","500"];
  const expression='(() => { const nodes=[...document.querySelectorAll(".mobi-live-steps form")[0].querySelectorAll("input")];'+
   'const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;'+
   'const values='+JSON.stringify(values)+'; values.forEach((value,i)=>{setter.call(nodes[i],value);nodes[i].dispatchEvent(new Event("input",{bubbles:true}));});return true;})()';
  await evaluate(cdp,expression);
  await sleep(200);
  await evaluate(cdp,'document.querySelectorAll(".mobi-live-steps form")[0].requestSubmit();true');
  await waitUi('document.querySelectorAll(".mobi-live-steps form")[1].querySelector("select")?.options.length>1');
  assert(await evaluate(cdp,'document.querySelector(".mobi-live-message")?.textContent.includes("حُفظت")'),"C-LIVE product UI creation failed");
  console.log("C_LIVE_UI_PRODUCT_CREATED",sku);
  await evaluate(cdp, '(() => { const form=document.querySelectorAll(".mobi-live-steps form")[1];const selects=[...form.querySelectorAll("select")];const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set;selects.forEach(x=>{setter.call(x,x.options[1].value);x.dispatchEvent(new Event("change",{bubbles:true}));});const input=form.querySelector("input[pattern]");const native=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;native.call(input,"352099001761481");input.dispatchEvent(new Event("input",{bubbles:true}));return true;})()');
  await sleep(200);
  await evaluate(cdp,'document.querySelectorAll(".mobi-live-steps form")[1].requestSubmit();true');
  await waitUi('document.querySelectorAll(".mobi-live-details tbody")[0]?.innerText.includes("352099001761481")');
  await capture(cdp,"c-live-01-received-imei");
  console.log("C_LIVE_UI_IMEI_RECEIVED");
  await evaluate(cdp,'(() => { const select=document.querySelectorAll(".mobi-live-steps form")[2].querySelector("select");const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set;setter.call(select,select.options[1].value);select.dispatchEvent(new Event("change",{bubbles:true}));window.confirm=()=>true;return true;})()');
  await sleep(150);
  await evaluate(cdp,'document.querySelectorAll(".mobi-live-steps form")[2].requestSubmit();true');
  await waitUi('document.querySelectorAll(".mobi-live-details tbody")[1]?.innerText.includes("INV-")');
  await waitUi('document.querySelectorAll(".mobi-live-details tbody")[0]?.innerText.includes("SOLD")');
  await navigate(cdp,base+"/ar/live-01",1440,1000);
  await waitUi('document.querySelectorAll(".mobi-live-details tbody")[1]?.innerText.includes("INV-")');
  await capture(cdp,"c-live-01-sold-and-invoiced");
  console.log("C_LIVE_01_BROWSER_WRITE_READBACK_PASS",sku);
"""
s=s.replace(anchor,anchor+"\n"+addon,1)
(v/"c-live-01-browser-full-e2e.mjs").write_text(s,encoding="utf8",newline="\n")
print("CREATED C-LIVE-01 FULL DOM E2E")
