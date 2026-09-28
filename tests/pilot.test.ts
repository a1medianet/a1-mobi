import { describe, expect, it } from "vitest";
import { classifyScan, normalizeScan } from "@/modules/pilot/scanner";
import { thermalReceiptHtml } from "@/modules/pilot/receipt";
import { evaluatePilotGate, PILOT_EVIDENCE_KEYS } from "@/modules/pilot/gate";

describe("pilot peripherals and gate", () => {
  it("normalizes keyboard-wedge scanner input", () => {
    expect(normalizeScan(" 490154203237518\r\n")).toBe("490154203237518");
    expect(classifyScan("490154203237518")).toEqual({ kind: "IMEI", value: "490154203237518" });
    expect(classifyScan("1234567890123").kind).toBe("EAN13");
    expect(() => classifyScan("<script>")).toThrow();
  });

  it("renders escaped 80mm printable receipt", () => {
    const html = thermalReceiptHtml({ storeName: "A1 Mobi", number: "INV-1", currency: "USD",
      lines: [{ label: "<Phone>", quantity: 1, amount: 500 }] });
    expect(html).toContain("@page{size:80mm auto");
    expect(html).toContain("&lt;Phone&gt;");
    expect(html).toContain("Total: 500.00 USD");
  });

  it("blocks pilot until every real-world evidence item passes", () => {
    const evidence = Object.fromEntries(PILOT_EVIDENCE_KEYS.slice(0, -3).map((key) =>
      [key, { passed: true, reference: `automated:${key}`, observedAt: new Date().toISOString() }]));
    const gate = evaluatePilotGate(evidence);
    expect(gate.result).toBe("BLOCKED");
    expect(gate.missing).toEqual(["scanner-physical", "printer-physical", "store-day-uat"]);
  });
});
