from pathlib import Path
root=Path(r"C:\A1Hub\a1-mobi\versions\C-LIVE-02")
source=(root/"c-live-02-browser-journey.mjs").read_text(encoding="utf8")
target='  console.log("C_LIVE_02_BROWSER_REAL_ACTIONS_PASS",JSON.stringify({created:true,estimated:true,approved:true,started:true,ready:true,persistedAfterReload:true}));'
assert source.count(target)==1
steps="""
  await waitUi('document.querySelector(".mobi-live02-cash form")!==null');
  await evaluate(cdp,'(() => { const nodes=document.querySelectorAll(".mobi-live02-cash form input"); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;set.call(nodes[2],"90000");nodes[2].dispatchEvent(new Event("input",{bubbles:true}));window.confirm=()=>true;return true;})()');
  await sleep(150);
  await evaluate(cdp,'document.querySelector(".mobi-live02-cash form").requestSubmit();true');
  await waitUi('document.querySelector(".mobi-live02-cash h2")?.innerText.includes("الصندوق مفتوح")');
  console.log("C_LIVE_02_BROWSER_CASH_OPEN_PASS");
  async function enterPayment(value){
    const expr='(() => { const node=document.querySelector(".mobi-live02-settlement form input[type=number]");const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;set.call(node,'+
      JSON.stringify(value)+');node.dispatchEvent(new Event("input",{bubbles:true}));window.confirm=()=>true;return true;})()';
    await evaluate(cdp,expr);
    await sleep(150);
    await evaluate(cdp,'document.querySelector(".mobi-live02-settlement form").requestSubmit();true');
  }
  await enterPayment("50");
  await waitUi('document.querySelector(".mobi-live02-settlement")?.innerText.includes("70.00")');
  await capture(cdp,"c-live-02-browser-partial-payment");
  await enterPayment("70");
  await waitUi('document.querySelector(".mobi-live02-settlement")?.innerText.includes("تم تسديد القيمة")');
  console.log("C_LIVE_02_BROWSER_FULL_PAYMENT_PASS");
  await evaluate(cdp,'(() => {const form=document.querySelector(".mobi-live02-settlement form");const input=form.querySelectorAll("input")[1];const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;set.call(input,"Parts and workmanship for 30 days");input.dispatchEvent(new Event("input",{bubbles:true}));form.querySelector("input[type=checkbox]").click();window.confirm=()=>true;return true;})()');
  await sleep(190);
  await evaluate(cdp,'document.querySelector(".mobi-live02-settlement form").requestSubmit();true');
  await waitUi('document.querySelector(".activity-card tbody")?.innerText.includes("تم التسليم")');
  await navigate(cdp,base+"/ar/live-02",1440,900);
  await waitUi('document.querySelector(".activity-card tbody")?.innerText.includes("تم التسليم") && document.querySelector(".mobi-live02-settlement")?.innerText.includes("الضمان")');
  await capture(cdp,"c-live-02-browser-delivered-warranty");
  console.log("C_LIVE_02_SETTLEMENT_E2E_PASS",JSON.stringify({cashOpen:true,partialPayment:50,finalPayment:70,delivered:true,warranty:true,persistedAfterReload:true}));
"""
source=source.replace(target,target+"\n"+steps,1)
(root/"c-live-02-browser-settlement.mjs").write_text(source,encoding="utf8",newline="\n")
print("C_LIVE_02_SETTLEMENT_BROWSER_GATE_PREPARED")
