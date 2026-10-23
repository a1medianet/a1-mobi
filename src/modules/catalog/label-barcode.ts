import { classifyScan } from "@/modules/pilot/scanner";

const L = ["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"];
const G = ["0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"];
const PARITY = ["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"];
// ISO/IEC 15417 symbol widths, values 0–106 (stop includes the final bar).
const WIDTHS = "212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112".split(" ");
export type LabelBarcode = { value: string; format: "EAN13" | "CODE128"; bits: string };
export function encodeLabelBarcode(value: string): LabelBarcode {
  if (/^\d{13}$/.test(value)) {
    classifyScan(value); // Never repair a bad check digit.
    const digits = [...value].map(Number);
    const left = digits.slice(1,7).map((n,i)=>(PARITY[digits[0]][i]==="L"?L:G)[n]).join("");
    const right = digits.slice(7).map(n=>[...L[n]].map(b=>b==="0"?"1":"0").join("")).join("");
    return { value, format:"EAN13", bits:"0".repeat(11)+"101"+left+"01010"+right+"101"+"0".repeat(7) };
  }
  if (!/^[A-Za-z0-9._/-]{2,20}$/.test(value)) throw new Error("UNPRINTABLE_IDENTIFIER");
  const codes = [...value].map(c=>c.charCodeAt(0)-32);
  const checksum = (104+codes.reduce((sum,n,i)=>sum+n*(i+1),0))%103;
  const bits = [104,...codes,checksum,106].map(code=>[...WIDTHS[code]].map((width,i)=>(i%2===0?"1":"0").repeat(Number(width))).join("")).join("");
  return { value, format:"CODE128", bits:"0".repeat(10)+bits+"0".repeat(10) };
}
export function selectLabelBarcode(product: { sku:string; barcodes:readonly string[] }): LabelBarcode {
  for (const value of [...product.barcodes,product.sku]) {
    try { return encodeLabelBarcode(value); } catch { /* Try another registered identifier. */ }
  }
  throw new Error("UNPRINTABLE_IDENTIFIER");
}
export function labelQuantity(value:number) {
  if (!Number.isInteger(value)||value<1||value>100) throw new Error("INVALID_LABEL_QUANTITY");
  return value;
}
