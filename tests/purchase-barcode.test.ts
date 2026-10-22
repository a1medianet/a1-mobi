import { describe, expect, it } from "vitest";
import { addScannedReceiptProduct } from "@/modules/inventory/purchase-receipt";
const items=[{id:"part-1",sku:"PART-ONE",barcodes:["A1M-0000000042"],isSerialized:false},{id:"phone-1",sku:"PHONE-ONE",barcodes:["5901234123457"],isSerialized:true}];
describe("receiving purchases by scanned barcode",()=>{
  it("adds a purchase line and increments the same product without duplicates",()=>{
    const first=addScannedReceiptProduct("A1M-0000000042\r\n",items,[],9.5);
    expect(first).toEqual([{productId:"part-1",quantity:1,unitCost:9.5}]);
    const second=addScannedReceiptProduct("PART-ONE",items,first,9.5);
    expect(second).toEqual([{productId:"part-1",quantity:2,unitCost:9.5}]);
    expect(first[0].quantity).toBe(1);
    expect(()=>addScannedReceiptProduct("PART-ONE",items,first,10.5)).toThrow("RECEIPT_UNIT_COST_CONFLICT");
  });
  it("rejects unknown and serialized stock until separately received",()=>{
    expect(()=>addScannedReceiptProduct("OTHER1234",items,[],10)).toThrow("RECEIPT_PRODUCT_NOT_FOUND");
    expect(()=>addScannedReceiptProduct("5901234123457",items,[],10)).toThrow("SERIALIZED_RECEIVING_REQUIRES_DEVICE");
    expect(()=>addScannedReceiptProduct("490154203237518",items,[],10)).toThrow("SERIALIZED_RECEIVING_REQUIRES_DEVICE");
  });
  it("rejects invalid cost and preserves existing lines",()=>{
    expect(()=>addScannedReceiptProduct("PART-ONE",items,[],Number.NaN)).toThrow("INVALID_UNIT_COST");
    expect(()=>addScannedReceiptProduct("PART-ONE",items,[],-1)).toThrow("INVALID_UNIT_COST");
  });
});
