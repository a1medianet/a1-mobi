import { describe, expect, it } from "vitest";
import { encodeLabelBarcode, labelQuantity, selectLabelBarcode } from "@/modules/catalog/label-barcode";
import { classifyScan } from "@/modules/pilot/scanner";
import { addScannedCartProduct } from "@/modules/sell/scan-cart";

// Independent decoder: recognize EAN digit patterns and derive the leading digit from parity.
function decodeEan(bits:string) {
  const l=[13,25,19,61,35,49,47,59,55,11].map(n=>n.toString(2).padStart(7,"0"));
  const g=l.map(s=>[...s].reverse().map(b=>b==="1"?"0":"1").join(""));
  const r=l.map(s=>[...s].map(b=>b==="1"?"0":"1").join(""));
  const core=bits.slice(11,-7);
  expect(core.slice(0,3)).toBe("101");expect(core.slice(45,50)).toBe("01010");expect(core.slice(-3)).toBe("101");
  let parity="",digits="";
  for(let i=0;i<6;i++){const chunk=core.slice(3+i*7,10+i*7);const n=l.indexOf(chunk);parity+=n>=0?"L":"G";digits+=n>=0?n:g.indexOf(chunk);}
  const first=["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"].indexOf(parity);
  for(let i=0;i<6;i++)digits+=r.indexOf(core.slice(50+i*7,57+i*7));
  return String(first)+digits;
}
// Known Code128-B symbols needed by the independent scan fixture, including start/check/stop.
const symbols:Record<string,number>={"211214":104,"111323":33,"131123":34,"131321":35,"113321":46,"2331112":106,"123221":17,"223211":18,"221132":19,"113141":99,"141122":67};
function decode128(bits:string) {
  const core=bits.slice(10,-10);
  const runs=core.match(/1+|0+/g)!.map(s=>s.length).join("");
  const codes=[];
  for(let i=0;i<runs.length-7;i+=6)codes.push(symbols[runs.slice(i,i+6)]);
  expect(runs.slice(-7)).toBe("2331112");expect(codes.shift()).toBe(104);
  const check=codes.pop();expect(check).toBe((104+codes.reduce((s,n,i)=>s+n*(i+1),0))%103);
  return codes.map(n=>String.fromCharCode(n+32)).join("");
}
describe("printable label encoders",()=>{
  it.each(["5901234123457","4006381333931","1234567890128","0123456789012"])("decodes valid EAN %s from rendered modules",value=>{
    const encoded=encodeLabelBarcode(value);expect(encoded.format).toBe("EAN13");expect(encoded.bits.length).toBe(113);
    expect(classifyScan(decodeEan(encoded.bits)).value).toBe(value);
  });
  it("roundtrips Code128-B bars, weighted checksum and keyboard-wedge cart lookup",()=>{
    const encoded=encodeLabelBarcode("ABC123");const scanned=decode128(encoded.bits);
    expect(scanned).toBe("ABC123");expect(classifyScan(scanned).value).toBe(scanned);
    expect(addScannedCartProduct(scanned+"\r\n",[{id:"p",sku:scanned,barcodes:[],isSerialized:false}],[])).toEqual([{productId:"p",quantity:1}]);
  });
  it("has the golden ABC symbol sequence including checksum 1 (value 1)",()=>{
    const encoded=encodeLabelBarcode("ABC");
    const runs=encoded.bits.slice(10,-10).match(/1+|0+/g)!.map(s=>s.length).join(" ");
    expect(runs).toBe("2 1 1 2 1 4 1 1 1 3 2 3 1 3 1 1 2 3 1 3 1 3 2 1 2 2 2 1 2 2 2 3 3 1 1 1 2");
  });
  it.each(["5901234123458","1234567890123","<script>","a".repeat(33),"رمز","A B"])("rejects invalid or unsafe value %s",value=>expect(()=>encodeLabelBarcode(value)).toThrow());
  it("falls back to the existing SKU without correcting invalid EAN",()=>expect(selectLabelBarcode({sku:"ABC123",barcodes:["5901234123458"]}).value).toBe("ABC123"));
  it.each([0,101,1.5,NaN,Infinity])("rejects quantity %s",n=>expect(()=>labelQuantity(n)).toThrow());
  it("accepts quantity bounds",()=>{expect(labelQuantity(1)).toBe(1);expect(labelQuantity(100)).toBe(100);});
});
