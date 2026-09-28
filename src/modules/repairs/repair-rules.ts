import { RepairStatus } from "@prisma/client";

const allowedTransitions: Record<RepairStatus, RepairStatus[]> = {
  INTAKE: [RepairStatus.DIAGNOSIS, RepairStatus.CANCELLED],
  DIAGNOSIS: [RepairStatus.ESTIMATE_PENDING, RepairStatus.CANCELLED],
  ESTIMATE_PENDING: [RepairStatus.APPROVED, RepairStatus.CANCELLED],
  APPROVED: [RepairStatus.IN_PROGRESS, RepairStatus.CANCELLED],
  IN_PROGRESS: [RepairStatus.READY, RepairStatus.CANCELLED],
  READY: [RepairStatus.DELIVERED, RepairStatus.IN_PROGRESS],
  DELIVERED: [],
  CANCELLED: [],
};

export function assertRepairTransition(from: RepairStatus, to: RepairStatus) {
  if (!allowedTransitions[from].includes(to)) {
    throw new Error(`Invalid repair transition: ${from} -> ${to}`);
  }
}

export function validateIntake(input: {
  customerName: string;
  customerPhone: string;
  deviceDescription: string;
  condition: string;
  reportedIssue: string;
}) {
  const required: Array<[string, string]> = [
    ["customerName", input.customerName],
    ["customerPhone", input.customerPhone],
    ["deviceDescription", input.deviceDescription],
    ["condition", input.condition],
    ["reportedIssue", input.reportedIssue],
  ];
  for (const [field, value] of required) {
    if (!value.trim()) throw new Error(`${field} is required`);
  }
  const phone = input.customerPhone.replace(/[^0-9+]/g, "");
  if (phone.length < 7) throw new Error("Customer phone is invalid");
  return { ...input, customerPhone: phone };
}

export function calculateRepairTruth(input: {
  finalPrice: number;
  partCosts: number[];
  laborCost: number;
  directCost: number;
  paidTotal: number;
}) {
  const values = [input.finalPrice, input.laborCost, input.directCost, input.paidTotal, ...input.partCosts];
  if (!values.every((value) => Number.isFinite(value) && value >= 0)) {
    throw new Error("Repair financial values must be non-negative");
  }
  const partsCost = round(input.partCosts.reduce((sum, cost) => sum + cost, 0));
  const totalCost = round(partsCost + input.laborCost + input.directCost);
  const profit = round(input.finalPrice - totalCost);
  const balanceDue = round(Math.max(input.finalPrice - input.paidTotal, 0));
  return { partsCost, totalCost, profit, balanceDue };
}

export function validateRepairPart(input: {
  source: "STOCK" | "DEDICATED_PURCHASE" | "EXTERNAL";
  productId?: string;
  stockLocationId?: string;
  quantity: number;
  unitCost: number;
}) {
  if (input.quantity <= 0 || !Number.isFinite(input.quantity)) throw new Error("Part quantity must be positive");
  if (input.unitCost < 0 || !Number.isFinite(input.unitCost)) throw new Error("Part cost is invalid");
  if (input.source === "STOCK" && (!input.productId || !input.stockLocationId)) {
    throw new Error("Stock part requires product and location");
  }
  return { totalCost: round(input.quantity * input.unitCost) };
}

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}
