import { describe, expect, it } from "vitest";
import {filterRepairs,summarizeRepairs,type RepairListItem} from "@/modules/repairs/repair-owner-view";
const repairs:RepairListItem[]=[
 {id:"1",number:"REP-101",customerName:"عميل اختبار ألف",device:"Samsung S24",issue:"Screen",imeiLast4:"7788",status:"INTAKE",balanceDue:0},
 {id:"2",number:"REP-102",customerName:"Test Client B",device:"iPhone 15",issue:"Battery",imeiLast4:"2244",status:"ESTIMATE_PENDING",balanceDue:70},
 {id:"3",number:"REP-103",customerName:"Test Client C",device:"Xiaomi",issue:"Port",imeiLast4:null,status:"READY",balanceDue:120.5},
 {id:"4",number:"REP-104",customerName:"Test Client D",device:"Pixel",issue:"Display",imeiLast4:null,status:"DELIVERED",balanceDue:0},
];
describe("owner repair list view",()=>{
 it("filters real server rows by state without manufacturing data",()=>{
  expect(filterRepairs(repairs,"","ALL")).toHaveLength(4);
  expect(filterRepairs(repairs,"","ACTIVE").map(r=>r.id)).toEqual(["1","2"]);
  expect(filterRepairs(repairs,"","AWAITING").map(r=>r.id)).toEqual(["2"]);
  expect(filterRepairs(repairs,"","READY").map(r=>r.id)).toEqual(["3"]);
  expect(filterRepairs(repairs,"","DELIVERED").map(r=>r.id)).toEqual(["4"]);
  expect(filterRepairs([],"","ALL")).toEqual([]);
 });
 it("searches ticket, customer, device, issue and last four IMEI digits",()=>{
  expect(filterRepairs(repairs," rep-103 ","ALL")[0]?.id).toBe("3");
  expect(filterRepairs(repairs,"آلف","ALL")).toEqual([]);
  expect(filterRepairs(repairs,"عميل اختبار","ALL")[0]?.id).toBe("1");
  expect(filterRepairs(repairs,"IPHONE","ALL")[0]?.id).toBe("2");
  expect(filterRepairs(repairs,"7788","ALL")[0]?.id).toBe("1");
  expect(filterRepairs(repairs,"Battery","READY")).toEqual([]);
 });
 it("summarizes only scoped returned rows, not global tenant counts",()=>{
  expect(summarizeRepairs(repairs)).toEqual({total:4,active:2,ready:1,balanceDue:120.5});
  expect(summarizeRepairs([])).toEqual({total:0,active:0,ready:0,balanceDue:0});
 });
});
