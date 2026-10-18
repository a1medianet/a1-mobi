import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css=readFileSync(resolve(process.cwd(),"src/app/globals.css"),"utf8");
const browserGate=readFileSync(resolve(process.cwd(),"scripts/abc-browser-qa.mjs"),"utf8");

describe("A1 Mobi full logos at approved 80% scale",()=>{
 it("uses proportional official logo widths on each intended surface",()=>{
  expect(css).toContain(".mobi-brand-asset>img{display:block;width:147px;");
  expect(css).toContain(".product-footer .footer-brand-asset>img{width:139px}");
  expect(css).toContain("@media(max-width:760px){.product-nav .mobi-brand-asset>img{width:118px}}");
  expect(css).toContain("@media(max-width:450px){.product-nav .mobi-brand-asset>img{width:101px}}");
  expect(css).toContain(".brand-row .brand .a1-mobi-sidebar-logo{display:block;width:136px;");
 });
 it("retains true square-only icon sizes and prevents outdated visual acceptance",()=>{
  expect(css).toContain(".mobile-brand .a1-mobi-brand-icon{width:33px;height:33px}");
  expect(css).toContain(".brand-row .brand .a1-mobi-sidebar-icon{display:none;width:42px;height:42px;");
  expect(browserGate).toContain('i.getBoundingClientRect().width>=125 && i.getBoundingClientRect().width<=140');
  expect(browserGate).toContain('a1-mobi-logo-white.svg');
 });
});
