import {describe,expect,it} from "vitest";
import {canViewRechargeCosts,projectRechargeForStore} from "@/modules/recharge-bridge/public-projection";

const payload={
 sandbox:true,
 catalogVersionId:"ver-1",
 items:[{sku:"ALFA-TEST",priceMinor:150,feeMinor:0,costMinor:80,
  supplierName:"test supplier",marginMinor:70,apiKey:"never-expose",
  metadata:{providerCostMinor:80,netPriceMinor:150,secretToken:"never-expose"},
 }],
};

describe("G5 web response — cost, margin and credentials stay server-side",()=>{
 it("redacts nested supplier economics and secrets for cashiers without cost.read",()=>{
  const projected=projectRechargeForStore(payload,false);
  expect(projected).toEqual({sandbox:true,catalogVersionId:"ver-1",items:[{
   sku:"ALFA-TEST",priceMinor:150,feeMinor:0,metadata:{netPriceMinor:150},
  }]});
  expect(payload.items[0].costMinor).toBe(80);
 });
 it("allows authorized owners to see supplier costs but never secrets",()=>{
  const projected=projectRechargeForStore(payload,true);
  expect(projected.items[0]).toMatchObject({costMinor:80,marginMinor:70,supplierName:"test supplier"});
  expect(projected.items[0]).not.toHaveProperty("apiKey");
  expect(projected.items[0].metadata).not.toHaveProperty("secretToken");
 });
 it("requires explicit cost.read or foundation.manage for supplier data",()=>{
  expect(canViewRechargeCosts(new Set(["topup.manage"]))).toBe(false);
  expect(canViewRechargeCosts(new Set(["topup.manage","cash.manage"]))).toBe(false);
  expect(canViewRechargeCosts(new Set(["cost.read"]))).toBe(true);
  expect(canViewRechargeCosts(new Set(["foundation.manage"]))).toBe(true);
 });
});