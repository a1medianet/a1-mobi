import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { availableBranchDevices } from "@/modules/pilot/branch-stock";
import { OperationalJourney } from "@/components/operational-journey";

describe("A1 Mobi product to stock to sale flow", () => {
  it("offers only currently available devices at this branch, never another branch's IMEI", () => {
    const devices = [
      { id: "own", locationId: "branch-stock-1", status: "IN_STOCK" },
      { id: "elsewhere", locationId: "branch-stock-2", status: "IN_STOCK" },
      { id: "sold", locationId: "branch-stock-1", status: "SOLD" },
      { id: "lost-location", locationId: null, status: "IN_STOCK" },
    ];
    expect(availableBranchDevices(devices, [{ id: "branch-stock-1" }]).map(device => device.id)).toEqual(["own"]);
  });

  it("keeps the three navigation stages in Arabic and English with the active stage labeled", () => {
    const ar = renderToStaticMarkup(OperationalJourney({ locale: "ar", active: "inventory" }));
    const en = renderToStaticMarkup(OperationalJourney({ locale: "en", active: "pos" }));
    expect(ar.match(/class="mobi-journey-link/g)?.length).toBe(3);
    expect(ar).toContain('aria-current="step"');
    expect(ar).toContain("/ar/products");
    expect(ar).toContain("/ar/pos");
    expect(en).toContain("/en/inventory");
    expect(en).toContain("3. Point of sale");
  });
});
