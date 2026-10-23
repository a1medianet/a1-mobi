import { describe, expect, it } from "vitest";
import { liveOperationStatus } from "@/components/live-operations";

describe("C canonical POS and inventory owner labels",()=>{
 it("renders device and invoice states in Arabic",()=>{
  expect(liveOperationStatus("IN_STOCK","ar")).toBe("متوفر");
  expect(liveOperationStatus("SOLD","ar")).toBe("تم البيع");
  expect(liveOperationStatus("COMPLETED","ar")).toBe("مكتملة");
  expect(liveOperationStatus("RETURNED","ar")).toBe("مرتجع");
 });
 it("renders readable English statuses without leaking internal enum labels",()=>{
  expect(liveOperationStatus("IN_STOCK","en")).toBe("Available");
  expect(liveOperationStatus("SOLD","en")).toBe("Sold");
  expect(liveOperationStatus("COMPLETED","en")).toBe("Completed");
 });
 it("hides unknown server codes without inventing a financial state",()=>{
  expect(liveOperationStatus("REVIEW_REQUIRED","ar")).toBe("الحالة غير متاحة");
  expect(liveOperationStatus("REVIEW_REQUIRED","en")).toBe("Status unavailable");
 });
});
