import "server-only";
import { DebtEntryKind, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { reconcileDebtEntries } from "./debt-reconciliation";

/** Owner-authorized manual opening/adjustment; never posts a cash receipt. */
export async function recordManualDebt(input:{
  tenantId:string;branchId:string;actorId:string;customerId:string;
  amount:string;currency:"USD"|"LBP";reason:string;idempotencyKey:string;
}){
  if(input.reason.trim().length<8||input.reason.trim().length>300)throw Error("INVALID_REASON");
  const amount=new Prisma.Decimal(input.amount);
  if(!amount.isFinite()||amount.lte(0)||amount.gt(100000000))throw Error("INVALID_AMOUNT");
  return db.$transaction(async tx=>{
    const existing=await tx.debtEntry.findUnique({where:{tenantId_idempotencyKey:{
      tenantId:input.tenantId,idempotencyKey:input.idempotencyKey,
    }}});
    if(existing)return existing;
    const [customer,account,branch,actor]=await Promise.all([
      tx.customer.findFirst({where:{id:input.customerId,tenantId:input.tenantId},select:{id:true}}),
      tx.debtAccount.findFirst({where:{customerId:input.customerId,tenantId:input.tenantId}}),
      tx.branch.findFirst({where:{id:input.branchId,tenantId:input.tenantId},select:{id:true}}),
      tx.user.findFirst({where:{id:input.actorId,tenantId:input.tenantId},select:{id:true}}),
    ]);
    if(!customer||!account||!branch||!actor)throw Error("DEBT_SCOPE_DENIED");
    if(account.currency!=="USD"&&account.currency!=="LBP")throw Error("UNSUPPORTED_DEBT_CURRENCY");
    const entries=await tx.debtEntry.findMany({
      where:{tenantId:input.tenantId,debtAccountId:account.id},
      select:{branchId:true,kind:true,amount:true},
    });
    const check=reconcileDebtEntries({openingBalance:"0",accountBalance:account.balance.toString(),
      entries:entries.map(x=>({branchId:x.branchId,kind:x.kind,amount:x.amount.toString()}))});
    if(!check.reconciled)throw Error("DEBT_RECONCILIATION_REQUIRED");

    let baseAmount=amount;
    let rateUsed="1",rateId:string|null=null;
    if(input.currency!==account.currency){
      const rate=await tx.exchangeRate.findFirst({
        where:{tenantId:input.tenantId,branchId:input.branchId,effectiveAt:{lte:new Date()},
          OR:[{baseCurrency:input.currency,quoteCurrency:account.currency},
              {baseCurrency:account.currency,quoteCurrency:input.currency}]},
        orderBy:[{effectiveAt:"desc"},{id:"desc"}],
      });
      if(!rate||Date.now()-rate.effectiveAt.getTime()>24*60*60*1000)
        throw Error("CURRENT_EXCHANGE_RATE_REQUIRED");
      if(rate.rate.lte(0))throw Error("INVALID_EXCHANGE_RATE");
      baseAmount=rate.baseCurrency===input.currency?amount.mul(rate.rate):amount.div(rate.rate);
      baseAmount=baseAmount.toDecimalPlaces(4,Prisma.Decimal.ROUND_HALF_UP);
      rateUsed=rate.rate.toString();rateId=rate.id;
    }
    if(baseAmount.lte(0)||baseAmount.gt(100000000))throw Error("INVALID_AMOUNT");
    const newBalance=account.balance.plus(baseAmount);
    const entry=await tx.debtEntry.create({data:{
      tenantId:input.tenantId,branchId:input.branchId,debtAccountId:account.id,
      kind:DebtEntryKind.ADJUSTMENT_DEBIT,amount:baseAmount,balanceAfter:newBalance,
      reason:input.reason.trim(),idempotencyKey:input.idempotencyKey,
    }});
    await tx.debtAccount.update({where:{id:account.id},data:{balance:newBalance}});
    await tx.auditEvent.create({data:{
      tenantId:input.tenantId,branchId:input.branchId,actorId:input.actorId,
      action:"debt.manual_charge.posted",entityType:"DebtEntry",entityId:entry.id,
      after:{originalAmount:amount.toString(),originalCurrency:input.currency,
        bookedAmount:baseAmount.toString(),accountCurrency:account.currency,
        rateUsed,rateId,reason:input.reason.trim(),balanceAfter:newBalance.toString()},
    }});
    return entry;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}
