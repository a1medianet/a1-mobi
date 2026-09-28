import { roundMoney } from "./pricing";

export type PaymentInput = {
  currency: string;
  amount: number;
  exchangeRate: number;
};

export function paymentToBase(payment: PaymentInput): number {
  if (!payment.currency.trim()) throw new Error("Payment currency is required");
  if (!Number.isFinite(payment.amount) || payment.amount <= 0) {
    throw new Error("Payment amount must be positive");
  }
  if (!Number.isFinite(payment.exchangeRate) || payment.exchangeRate <= 0) {
    throw new Error("Exchange rate must be positive");
  }
  return roundMoney(payment.amount / payment.exchangeRate);
}

export function summarizePayments(total: number, payments: PaymentInput[]) {
  if (!Number.isFinite(total) || total < 0) throw new Error("Sale total is invalid");
  const paidTotal = roundMoney(payments.reduce((sum, payment) => sum + paymentToBase(payment), 0));
  const balanceDue = roundMoney(Math.max(total - paidTotal, 0));
  const changeDue = roundMoney(Math.max(paidTotal - total, 0));
  const status = balanceDue === 0 ? "COMPLETED" : paidTotal > 0 ? "PARTIALLY_PAID" : "UNPAID";
  return { paidTotal, balanceDue, changeDue, status } as const;
}
