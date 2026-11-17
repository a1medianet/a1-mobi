import { createHash, timingSafeEqual } from "node:crypto";

/** A1 Trust candidate adapter boundary. Cryptographic approval authenticity
 * MUST be verified separately by a future trusted provider before this binding check.
 * This module never grants permission or authorizes a transaction on its own.
 */
export type SensitiveAction =
  | "sale.return" | "cash.close.variance" | "product.price.change"
  | "team.permissions.change" | "topup.financial.approval";
export type ApprovalBinding = {
  tenantId:string;branchId:string;actorId:string;action:SensitiveAction;
  amountMinor?:string;currency?:string;requestId:string;
  operation:Record<string,unknown>;
};
function canonical(value:unknown):string {
  if(value===null||typeof value==="string"||typeof value==="number"||typeof value==="boolean"){
    if(typeof value==="number"&&!Number.isFinite(value))throw new Error("INVALID_APPROVAL_BINDING");
    return JSON.stringify(value);
  }
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(typeof value!=="object"||!value)throw new Error("INVALID_APPROVAL_BINDING");
  const data=value as Record<string,unknown>;
  return "{"+Object.keys(data).sort().map(k=>JSON.stringify(k)+":"+canonical(data[k])).join(",")+"}";
}
export function approvalBindingDigest(binding:ApprovalBinding):string {
  if(!binding.tenantId||!binding.branchId||!binding.actorId||!binding.requestId)
    throw new Error("INCOMPLETE_APPROVAL_BINDING");
  return createHash("sha256").update("A1-MOBI-APPROVAL-v1\0"+canonical(binding)).digest("hex");
}
export function approvedOperationMatches(binding:ApprovalBinding,approvedDigest:string):boolean {
  if(!/^[a-f0-9]{64}$/.test(approvedDigest))return false;
  const actual=Buffer.from(approvalBindingDigest(binding),"hex");
  return timingSafeEqual(actual,Buffer.from(approvedDigest,"hex"));
}
