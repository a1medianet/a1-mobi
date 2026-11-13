import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {join} from "node:path";
const src=(file:string)=>readFileSync(join(process.cwd(),"src",file),"utf8");
describe("Mobi independent lost-found window",()=>{
 it("is a separately routable AR/EN workspace with its own page and sidebar item",()=>{
  const shell=src("components/app-shell.tsx");
  const page=src("app/[locale]/lost-found/page.tsx");
  expect(shell).toContain('"/lost-found"');
  expect(shell).toContain('"المفقودات والبلاغات"');
  expect(shell).toContain('"Lost & found"');
  expect(page).toContain("ImeiStorePanel");
  expect(page).toContain('locale!=="ar"&&locale!=="en"');
 });
 it("preserves independent IMEI checksum screen without embedding a lost-report form",()=>{
  const page=src("app/[locale]/device-trust/page.tsx");
  expect(page).not.toContain("ImeiStorePanel");
  expect(page).toContain("isValidImei");
 });
 it("keeps the private incident registry disconnected from any public external feed",()=>{
  const api=src("app/api/ops/imei/route.ts");
  expect(api).toContain('DeviceIncidentStatus.EVIDENCE_PENDING');
  expect(api).toContain('DeviceIncidentVisibility.STORE_ONLY');
  expect(api).toContain('externalRegistryNotified:false');
  expect(api).toContain('externalRegistryChecked:false');
  expect(api).toContain('currentStoreContext');
  expect(api).toContain('tenantId:ctx.tenantId');
  expect(api).not.toContain('visibility:DeviceIncidentVisibility.PUBLIC');
 });
});
