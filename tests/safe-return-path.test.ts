import { describe,expect,it } from "vitest";
import { safeStoreReturnPath } from "@/core/auth/safe-return-path";
describe("safe post-login return paths",()=>{
 it("preserves only internal, same-locale protected destinations",()=>{
  expect(safeStoreReturnPath("/ar/live-02","ar")).toBe("/ar/live-02");
  expect(safeStoreReturnPath("/en/inventory","en")).toBe("/en/inventory");
  expect(safeStoreReturnPath("/ar","ar")).toBe("/ar");
 });
 it("rejects cross-locale, external URLs, query and path traversal",()=>{
  for(const value of ["https://host.invalid/ar","//host.invalid","/en/live-02",
    "/ar/../settings","/ar//settings","/ar/login","/ar/recover",
    "/ar/live-02?next=//host.invalid","/ar/%2e%2e","/ar/live-02#anchor",
    "\\host.invalid",null,undefined]) {
    expect(safeStoreReturnPath(value,"ar")).toBe("/ar");
  }
 });
 it("rejects oversized or malformed return values",()=>{
  expect(safeStoreReturnPath("/ar/"+ "a".repeat(200),"ar")).toBe("/ar");
  expect(safeStoreReturnPath({url:"/ar/live-02"},"ar")).toBe("/ar");
 });
});
