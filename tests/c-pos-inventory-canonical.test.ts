import { afterEach, describe, expect, it, vi } from "vitest";
import PosPage from "@/app/[locale]/pos/page";
import InventoryPage from "@/app/[locale]/inventory/page";
import LiveOperationsPage from "@/components/live-operations";
import DemoPosPage from "@/components/demo-pos";

afterEach(()=>vi.unstubAllEnvs());

describe("C owner POS and inventory canonical routes",()=>{
 it.each(["ar","en"])("routes /%s/pos and /%s/inventory through existing live backend when enabled",async locale=>{
  vi.stubEnv("A1_MOBI_C_LIVE_01_ENABLED","1");
  const pos=await PosPage({params:Promise.resolve({locale})});
  const inventory=await InventoryPage({params:Promise.resolve({locale})});
  expect(pos.type).toBe(LiveOperationsPage);
  expect(pos.props.mode).toBe("pos");
  expect(inventory.type).toBe(LiveOperationsPage);
  expect(inventory.props.mode).toBe("inventory");
 });
 it.each(["ar","en"])("preserves explicit demo routes in %s when gate OFF",async locale=>{
  vi.stubEnv("A1_MOBI_C_LIVE_01_ENABLED","0");
  const pos=await PosPage({params:Promise.resolve({locale})});
  const inventory=await InventoryPage({params:Promise.resolve({locale})});
  expect(pos.type).toBe(DemoPosPage);
  expect(inventory.type).toBe("main");
  expect(inventory.props.className).toBe("module-page");
 });
 it("uses the fail-closed default and refuses an unsupported locale",async ()=>{
  vi.stubEnv("A1_MOBI_C_LIVE_01_ENABLED","");
  expect((await PosPage({params:Promise.resolve({locale:"ar"})})).type).toBe(DemoPosPage);
  await expect(PosPage({params:Promise.resolve({locale:"fr"})})).rejects.toThrow();
  await expect(InventoryPage({params:Promise.resolve({locale:"fr"})})).rejects.toThrow();
 });
});
