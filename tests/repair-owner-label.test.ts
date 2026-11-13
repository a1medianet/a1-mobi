import { describe, expect, it } from "vitest";
import { repairOwnerLabel } from "@/components/repair-live-operations";

describe("repair owner display — synthetic labels only", () => {
 it("hides internal fixture codes in Arabic without changing normal names", () => {
  expect(repairOwnerLabel("[UAT-FIN-03] Selected Workspace Settlement","ar")).toBe("عميل تجريبي — طلب مُسلّم");
  expect(repairOwnerLabel("Customer D [UAT-VISUAL-02]","ar")).toBe("Customer D");
  expect(repairOwnerLabel("Customer D","ar")).toBe("Customer D");
 });
 it("gives English sample cases readable names", () => {
  expect(repairOwnerLabel("[UAT-FIN-02] Browser Settlement","en")).toBe("Sample customer — payment");
  expect(repairOwnerLabel("Customer C [UAT-VISUAL-02]","en")).toBe("Customer C");
 });
 it("keeps ordinary repair descriptions and IMEI-related values unchanged", () => {
  expect(repairOwnerLabel("iPhone 15 Pro","ar")).toBe("iPhone 15 Pro");
  expect(repairOwnerLabel("Repair payment journey","ar")).toBe("Repair payment journey");
  expect(repairOwnerLabel("OnePlus device 1234","en")).toBe("OnePlus device 1234");
 });
 it("localizes known synthetic test issues without altering database records", () => {
  expect(repairOwnerLabel("UAT repair payment journey","ar")).toBe("فحص الجهاز وتحصيل الصيانة");
  expect(repairOwnerLabel("Battery replacement [UAT]","ar")).toBe("استبدال البطارية");
  expect(repairOwnerLabel("UAT Test OnePlus Device","ar")).toBe("جهاز OnePlus");
 });
});
