// src/lib/finance.ts
import { Transaction, TransactionStatus } from "@/lib/types";

const CASH_ADVANCE_OUTFLOW_STATUSES: TransactionStatus[] = [
  "disbursed",
  "in_review",
  "done",
];

export const getBaseAmount = (t: Transaction) =>
  t.amount_realized ?? t.amount_requested ?? 0;

export const getOutflowAmount = (t: Transaction) => {
  const amount = getBaseAmount(t);
  const returned = t.amount_returned ?? 0;
  return Math.max(0, amount - returned);
};

export const isOutflowTransaction = (t: Transaction) => {
  if (t.type === "income") return false;
  if (t.type === "cash_advance") {
    return CASH_ADVANCE_OUTFLOW_STATUSES.includes(t.status);
  }
  return t.status === "done";
};

export const shouldAffectBalance = (t: Transaction) => {
  if (t.type === "income") return t.status === "done";
  return isOutflowTransaction(t);
};
