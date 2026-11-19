import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it,vi} from "vitest";
vi.mock("@/components/topup-owner-live",()=>({
 default:()=>createElement("span",{"data-test":"manual"},"MANUAL_LEDGER_COMPONENT"),
}));
vi.mock("@/components/recharge-g5-sandbox",()=>({
 default:()=>createElement("span",{"data-test":"sandbox"},"RECHARGE_TEST_COMPONENT"),
}));
import TopupMethodWorkspace from "@/components/topup-method-workspace";

describe("G5 top-up method separation",()=>{
 it("preserves only the manual path when the sandbox mapping is unavailable",()=>{
  const html=renderToStaticMarkup(createElement(TopupMethodWorkspace,{
   locale:"ar",integrationSandboxEnabled:false,
  }));
  expect(html).toContain("MANUAL_LEDGER_COMPONENT");
  expect(html).not.toContain("RECHARGE_TEST_COMPONENT");
  expect(html).not.toContain("role=\"tablist\"");
 });
 it("offers explicit method tabs with the manual path selected by default",()=>{
  const html=renderToStaticMarkup(createElement(TopupMethodWorkspace,{
   locale:"ar",integrationSandboxEnabled:true,
  }));
  expect(html).toContain("التعبئة اليدوية");
  expect(html).toContain("A1 Recharge");
  expect(html).toContain("role=\"tablist\"");
  expect(html).toContain("id=\"topup-manual-tab\" aria-selected=\"true\"");
  expect(html).toContain("id=\"topup-recharge-tab\" aria-selected=\"false\"");
  expect(html).toContain("MANUAL_LEDGER_COMPONENT");
  expect(html).toContain("RECHARGE_TEST_COMPONENT");
  expect(html).toContain("G5");
 });
 it("supports English and makes the test-only character explicit",()=>{
  const html=renderToStaticMarkup(createElement(TopupMethodWorkspace,{
   locale:"en",integrationSandboxEnabled:true,
  }));
  expect(html).toContain("Manual top-up");
  expect(html).toContain("Sandbox");
  expect(html).toContain("Synthetic");
 });
});