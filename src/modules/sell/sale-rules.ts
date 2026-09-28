import { evaluatePrice, roundMoney } from "./pricing";
import { summarizePayments, type PaymentInput } from "./payments";

export type SaleLineInput = {
  productId: string;
  stockLocationId: string;
  serializedDeviceId?: string;
  isSerialized: boolean;
  quantity: number;
  basePrice: number;
  minimumPrice: number;
  finalPrice: number;
  canOverrideFloor: boolean;
  overrideActorId?: string;
  overrideReason?: string;
};

export function validateSaleLine(line: SaleLineInput) {
  if (!line.productId || !line.stockLocationId) throw new Error("Product and stock location are required");
  if (!Number.isFinite(line.quantity) || line.quantity <= 0) throw new Error("Quantity must be positive");
  if (line.isSerialized && line.quantity !== 1) throw new Error("Serialized sale quantity must equal one");
  if (line.isSerialized && !line.serializedDeviceId) throw new Error("Serialized sale requires an IMEI/serial device");
  if (!line.isSerialized && line.serializedDeviceId) throw new Error("Non-serialized line cannot reference a serialized device");

  const price = evaluatePrice({
    basePrice: line.basePrice,
    minimumPrice: line.minimumPrice,
    finalPrice: line.finalPrice,
    canOverrideFloor: line.canOverrideFloor,
    overrideActorId: line.overrideActorId,
    overrideReason: line.overrideReason,
  });

  return { ...price, lineTotal: roundMoney(line.finalPrice * line.quantity) };
}

export function priceSale(lines: SaleLineInput[], payments: PaymentInput[]) {
  if (!lines.length) throw new Error("Sale must contain at least one line");
  const pricedLines = lines.map(validateSaleLine);
  const subtotal = roundMoney(pricedLines.reduce((sum, line) => sum + line.lineTotal, 0));
  return { pricedLines, subtotal, total: subtotal, ...summarizePayments(subtotal, payments) };
}
