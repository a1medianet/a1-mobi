import "server-only";
import { SaleStatus, RepairStatus } from "@prisma/client";
import { db } from "@/server/db";

const recognizedSales: SaleStatus[] = [
  SaleStatus.UNPAID, SaleStatus.PARTIALLY_PAID, SaleStatus.COMPLETED,
  SaleStatus.PARTIALLY_RETURNED, SaleStatus.RETURNED,
];
const activeRepairs: RepairStatus[] = [
  RepairStatus.INTAKE, RepairStatus.DIAGNOSIS, RepairStatus.ESTIMATE_PENDING,
  RepairStatus.APPROVED, RepairStatus.IN_PROGRESS, RepairStatus.READY,
];
const toNumber = (value: unknown) => Number(value ?? 0);
const round4 = (value: number) => Math.round((value + Number.EPSILON) * 10000) / 10000;

// A compact, branch-bound operating report. This is NOT the older tenant-wide
// buildOwnerSummary; it intentionally avoids unverified profit/stock/debt totals.
export async function getBranchOperatingReport(scope:{
  tenantId:string;branchId:string;now?:Date;durationDays?:number;
}) {
  if(!scope.tenantId||!scope.branchId)throw new Error("REPORT_SCOPE_REQUIRED");
  const to=scope.now??new Date();
  if(!Number.isFinite(to.getTime()))throw new Error("INVALID_REPORT_WINDOW");
  const days=scope.durationDays??30;
  if(!Number.isInteger(days)||days<1||days>366)throw new Error("INVALID_REPORT_WINDOW");
  const from=new Date(to.getTime()-days*24*60*60*1000);
  const branch={tenantId:scope.tenantId,branchId:scope.branchId};
  const range={gte:from,lt:to};

  const [sales, returns, repairPayments, repairs, customers, closedDrawers] = await Promise.all([
    db.sale.aggregate({
      where:{...branch,occurredAt:range,status:{in:recognizedSales}},
      _sum:{total:true},_count:{_all:true},
    }),
    db.saleReturn.aggregate({
      where:{...branch,occurredAt:range,status:"POSTED"},
      _sum:{refundBase:true},_count:{_all:true},
    }),
    db.payment.aggregate({
      where:{...branch,paidAt:range,status:"POSTED",repairOrderId:{not:null}},
      _sum:{baseAmount:true},
    }),
    db.repairOrder.count({where:{...branch,status:{in:activeRepairs}}}),
    db.customer.count({where:{tenantId:scope.tenantId,createdBranchId:scope.branchId}}),
    db.cashSession.aggregate({
      where:{...branch,status:"CLOSED",closedAt:range},
      _sum:{varianceBase:true},
    }),
  ]);
  const gross=round4(toNumber(sales._sum.total));
  const refunded=round4(toNumber(returns._sum.refundBase));
  return {
    range:{from:from.toISOString(),to:to.toISOString()},
    grossRecordedSalesUsd:gross,
    postedReturnsUsd:refunded,
    salesAfterReturnsUsd:round4(gross-refunded),
    repairCollectedUsd:round4(toNumber(repairPayments._sum.baseAmount)),
    cashClosedVarianceUsd:round4(toNumber(closedDrawers._sum.varianceBase)),
    saleCount:sales._count._all,
    returnCount:returns._count._all,
    openRepairs:repairs,
    registeredCustomers:customers,
  };
}
