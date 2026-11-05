export type RepairListItem = {
  id: string;
  number: string;
  customerName: string;
  device: string;
  issue: string;
  imeiLast4: string | null;
  status: string;
  balanceDue: number;
};
export type RepairListFilter = "ALL" | "ACTIVE" | "AWAITING" | "READY" | "DELIVERED";
const awaiting = new Set(["ESTIMATE_PENDING", "APPROVED"]);
const active = new Set(["INTAKE","DIAGNOSIS","ESTIMATE_PENDING","APPROVED","IN_PROGRESS"]);
export function filterRepairs<T extends RepairListItem>(orders: readonly T[], query: string, filter: RepairListFilter): T[] {
  const needle = query.trim().toLocaleLowerCase();
  return orders.filter((order) => {
    const matchesStatus = filter === "ALL" ||
      (filter === "ACTIVE" && active.has(order.status)) ||
      (filter === "AWAITING" && awaiting.has(order.status)) ||
      (filter === "READY" && order.status === "READY") ||
      (filter === "DELIVERED" && order.status === "DELIVERED");
    if (!matchesStatus) return false;
    if (!needle) return true;
    return [order.number,order.customerName,order.device,order.issue,order.imeiLast4 ?? ""]
      .some((value) => value.toLocaleLowerCase().includes(needle));
  });
}
export function summarizeRepairs(orders: readonly RepairListItem[]) {
  return {
    total: orders.length,
    active: orders.filter((order) => active.has(order.status)).length,
    ready: orders.filter((order) => order.status === "READY").length,
    balanceDue: Math.round(orders.filter((order) => order.status === "READY")
      .reduce((sum,order) => sum + Math.max(0,order.balanceDue),0) * 100) / 100,
  };
}
