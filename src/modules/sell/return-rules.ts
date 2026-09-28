import { roundMoney } from "./pricing";

export type ReturnLineInput = {
  soldQuantity: number;
  previouslyReturnedQuantity: number;
  requestedQuantity: number;
  soldUnitPrice: number;
  serializedDeviceId?: string;
};

export function validateReturnLine(line: ReturnLineInput) {
  if (line.requestedQuantity <= 0) throw new Error("Return quantity must be positive");
  const available = roundMoney(line.soldQuantity - line.previouslyReturnedQuantity);
  if (line.requestedQuantity > available) throw new Error("Return quantity exceeds remaining sold quantity");
  if (line.serializedDeviceId && line.requestedQuantity !== 1) {
    throw new Error("Serialized return quantity must equal one");
  }
  return {
    available,
    refund: roundMoney(line.requestedQuantity * line.soldUnitPrice),
  };
}

export function requireReturnReason(reason: string) {
  if (!reason.trim()) throw new Error("Return reason is required");
  return reason.trim();
}
