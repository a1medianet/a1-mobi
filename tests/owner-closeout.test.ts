import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({billing:vi.fn()}));
vi.mock("next/navigation",async original=>({...await original<typeof import("next/navigation")>(),useParams:()=>({locale:"en"})}));
vi.mock("@/server/auth-http", () => ({currentStoreContext:async()=>({tenantId:"tenant-a",branchId:"branch-a"})}));
vi.mock("@/server/db", () => ({db:{
 tenant:{findUnique:async()=>({name:"Owner store",slug:"owner",billingTenantKey:"billing-a",_count:{branches:1},defaultLocale:"ar",baseCurrency:"USD"})},
 branch:{findUnique:async()=>({name:"Main",code:"MAIN"})},user:{count:async()=>1}
}}));
vi.mock("@/server/billing-client",()=>({getMobiEntitlements:mocks.billing}));
vi.mock("@/components/branch-manager",()=>({BranchManager:()=>null}));
import AccountPage from "@/app/[locale]/account/page";
import OrdersPage from "@/app/[locale]/orders/page";
import Dashboard from "@/app/[locale]/page";
import AdminPage from "@/app/[locale]/admin/page";
import LiveOperationsPage from "@/components/live-operations";
import RepairLivePage from "@/components/repair-live-operations";
describe("owner correction states",()=>{
 it.each(["ar","en"] as const)("keeps live home and admin free of sample data in %s",async locale=>{
  vi.stubEnv("A1_MOBI_C_LIVE_01_ENABLED","1");
  for(const Page of [Dashboard,AdminPage]){
   const html=renderToStaticMarkup(await Page({params:Promise.resolve({locale})}));
   expect(html).not.toMatch(/2,284|612.40|HARDENING|PARTIAL|Pilot Demo|operation-breakdown-chart|techzone/i);
   expect(html).toContain(`href="/${locale}/products"`);
   expect(html).toContain(`href="/${locale}/orders"`);
  }
 });
 it("retains inventory and repair forms inside expandable task sections",()=>{
  const inventory=renderToStaticMarkup(createElement<{mode?:"all"|"pos"|"inventory"}>(LiveOperationsPage,{mode:"inventory"}));
  expect(inventory).toContain("<details class=\"mobi-task-panel\"><summary>Add a new product</summary>");
  expect(inventory).toContain("Receive device");
  expect(inventory).toContain("Print barcode labels");
  const repair=renderToStaticMarkup(createElement(RepairLivePage));
  for(const id of ["mobi-repair-intake","mobi-repair-diagnosis"])expect(repair).toContain(`id="${id}"`);
  expect(repair.match(/<details class="mobi-task-panel">/g)).toHaveLength(2);
 });
 beforeEach(()=>{mocks.billing.mockReset();});
 afterEach(()=>vi.unstubAllEnvs());
 it.each(["ar","en"] as const)("hides upstream billing errors in %s",async locale=>{
  mocks.billing.mockRejectedValue(new Error("UPSTREAM_INTERNAL http://private-host secret-token"));
  const html=renderToStaticMarkup(await AccountPage({params:Promise.resolve({locale})}));
  expect(html).not.toMatch(/UPSTREAM_INTERNAL|private-host|secret-token|Billing Core/);
  expect(html).toContain(locale==="ar"?"تفاصيل الاشتراك غير متاحة":"Subscription details unavailable");
 });
 it.each(["ar","en"] as const)("shows disabled requests without loading an inbox in %s",async locale=>{
  vi.stubEnv("A1_MOBI_PUBLIC_ORDERS_ENABLED","0");
  const html=renderToStaticMarkup(await OrdersPage({params:Promise.resolve({locale})}));
  expect(html).toContain(`href="/${locale}/pos"`);
  expect(html).not.toContain("mobi-order-inbox");
  expect(html).toContain(locale==="ar"?"غير مفعّل":"not enabled");
 });
 it("retains the enabled inbox",async()=>{
  vi.stubEnv("A1_MOBI_PUBLIC_ORDERS_ENABLED","1");
  const html=renderToStaticMarkup(createElement("div",null,await OrdersPage({params:Promise.resolve({locale:"en"})})));
  expect(html).toContain("mobi-order-inbox");
 });
});
