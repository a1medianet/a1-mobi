import {describe,it,expect} from "vitest";
import {resolveRechargeSandboxMapping} from "@/modules/recharge-bridge/sandbox-config";
const tenants=[
 {tenantId:"mobi-demo-A",branchId:"mobi-branch-A",merchantId:"merchant-A",rechargeBranchId:"recharge-branch-A",token:"sandbox-token-A-123"},
 {tenantId:"mobi-demo-B",branchId:"mobi-branch-B",merchantId:"merchant-B",rechargeBranchId:"recharge-branch-B",token:"sandbox-token-B-123"},
];
const env={
 A1_MOBI_RECHARGE_ADAPTER_ENABLED:"true",
 A1_RECHARGE_SANDBOX_ONLY:"true",
 A1_RECHARGE_API_BASE_URL:"http://127.0.0.1:45678/",
 A1_MOBI_RECHARGE_SANDBOX_MAPPINGS_JSON:JSON.stringify(tenants),
};
describe("G5 v0.2 sandbox-only explicit enrollment",()=>{
 it("defaults to disabled and never infers production Top Mobile",()=>{
  expect(()=>resolveRechargeSandboxMapping("mobi-demo-A","mobi-branch-A",{})).toThrow("RECHARGE_SANDBOX_DISABLED");
  expect(()=>resolveRechargeSandboxMapping("topmobile","topmobile",env)).toThrow("RECHARGE_MERCHANT_NOT_ENROLLED");
 });
 it("maps two independent synthetic tenants and branches with no fallback",()=>{
  const a=resolveRechargeSandboxMapping("mobi-demo-A","mobi-branch-A",env);
  const b=resolveRechargeSandboxMapping("mobi-demo-B","mobi-branch-B",env);
  expect(a.mapping.merchantId).toBe("merchant-A");
  expect(a.mapping.rechargeBranchId).toBe("recharge-branch-A");
  expect(b.mapping.merchantId).toBe("merchant-B");
  expect(a.mapping.token).not.toBe(b.mapping.token);
  expect(()=>resolveRechargeSandboxMapping("mobi-demo-A","mobi-branch-B",env)).toThrow("RECHARGE_MERCHANT_NOT_ENROLLED");
 });
 it("rejects remote public Pilot URLs, even HTTPS",()=>{
  expect(()=>resolveRechargeSandboxMapping("mobi-demo-A","mobi-branch-A",{
   ...env,A1_RECHARGE_API_BASE_URL:"https://recharge.a1net.tech/",
  })).toThrow("RECHARGE_TEST_ENDPOINT_MUST_BE_LOOPBACK");
 });
 it("rejects any attempt to enable real money or use one shared identity",()=>{
  expect(()=>resolveRechargeSandboxMapping("mobi-demo-A","mobi-branch-A",{
   ...env,A1_MOBI_RECHARGE_REAL_MONEY_ENABLED:"1",
  })).toThrow("RECHARGE_SANDBOX_DISABLED");
  expect(()=>resolveRechargeSandboxMapping("mobi-demo-A","mobi-branch-A",{
   ...env,A1_MOBI_RECHARGE_SANDBOX_MAPPINGS_JSON:JSON.stringify([
    tenants[0],{...tenants[1],merchantId:"merchant-A",rechargeBranchId:"recharge-branch-A"},
   ]),
  })).toThrow("RECHARGE_MAPPING_NOT_ISOLATED");
 });
 it("requires exactly two well-formed test mappings",()=>{
  expect(()=>resolveRechargeSandboxMapping("mobi-demo-A","mobi-branch-A",{
   ...env,A1_MOBI_RECHARGE_SANDBOX_MAPPINGS_JSON:JSON.stringify([tenants[0]]),
  })).toThrow("RECHARGE_MAPPING_INVALID");
  expect(()=>resolveRechargeSandboxMapping("mobi-demo-A","mobi-branch-A",{
   ...env,A1_MOBI_RECHARGE_SANDBOX_MAPPINGS_JSON:"{wrong",
  })).toThrow("RECHARGE_MAPPING_INVALID");
 });
});
