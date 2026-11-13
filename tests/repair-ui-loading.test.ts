import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it,vi} from "vitest";
vi.mock("next/navigation",()=>({useParams:()=>({locale:"en"})}));
import RepairLivePage from "@/components/repair-live-operations";

describe("repair screen does not invent counts while the API has not replied",()=>{
 it("starts with unknown statistics, no fake empty results and no unverified cash form",()=>{
  const html=renderToStaticMarkup(createElement(RepairLivePage));
  expect(html).toContain("Repair orders");
  expect(html).toContain("Loading orders");
  expect(html.match(/>—<\/strong>/g)?.length).toBeGreaterThanOrEqual(3);
  expect(html).not.toContain("No repairs yet");
  expect(html).not.toContain("Cash drawer open");
  expect(html).not.toContain("Open cash drawer");
  expect(html).toContain("disabled");
  expect(html).toContain("Received accessories (comma-separated)");
 });
});
