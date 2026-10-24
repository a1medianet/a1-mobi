import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
describe("label print stylesheet contract (static, not browser layout)",()=>{
  const css=readFileSync("src/components/barcode-labels.css","utf8");
  it("defines exact media, hides surrounding app and avoids splitting labels",()=>{
    expect(css).toMatch(/@page\s*\{\s*size:\s*80mm 40mm;\s*margin:\s*0/);
    expect(css).toContain("body:has(> #barcode-label-print-root) > :not(#barcode-label-print-root) { display: none !important; }");
    expect(css).toContain("break-inside: avoid");expect(css).toContain("break-after: page");expect(css).toContain("break-after: auto");
    expect(css).toContain("width: 74mm; height: 18mm");
  });
});
