// src/components/features/FinanceStats.tsx
import React from "react";
import { Transaction } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import {
  getBaseAmount,
  getOutflowAmount,
  isOutflowTransaction,
} from "@/lib/finance";
import {
  Anchor,
  Ship,
  Waves,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface FinanceStatsProps {
  balance: number;
  transactions: Transaction[];
}

export function FinanceStats({ balance, transactions }: FinanceStatsProps) {
  const isDeficit = balance < 0;

  // Hitung Total Pemasukan & Pengeluaran (Yang sudah Done/Paid)
  const income = transactions
    .filter((t) => t.type === "income" && t.status === "done")
    .reduce(
      (acc, curr) => acc + getBaseAmount(curr),
      0,
    );

  const expense = transactions
    .filter(isOutflowTransaction)
    .reduce((acc, curr) => acc + getOutflowAmount(curr), 0);

  const pendingCount = transactions.filter((t) => t.status === "pending").length;
  const approvedCount = transactions.filter(
    (t) => t.status === "approved",
  ).length;
  const reviewCount = transactions.filter((t) => t.status === "in_review").length;
  const actionCount = pendingCount + approvedCount + reviewCount;

  return (
    <div className="grid gap-5 lg:grid-cols-4 sm:gap-6">
      <div className="rounded-3xl bg-gradient-to-br from-cyan-600 to-blue-600 p-4 text-white shadow-xl shadow-cyan-200/60 relative overflow-hidden sm:p-6">
        <div className="absolute right-0 top-0 h-36 w-36 translate-x-10 -translate-y-10 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute left-0 bottom-0 h-28 w-28 -translate-x-10 translate-y-10 rounded-full bg-white/15 blur-3xl" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/20 p-3 backdrop-blur">
              <Anchor size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold">
                Saldo Kas{isDeficit ? " (Defisit)" : ""}
              </p>
              <p className="text-xs opacity-80">
                {isDeficit ? "Pengeluaran melebihi pemasukan" : "Update realtime"}
              </p>
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {formatRupiah(balance)}
          </h2>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mb-4 flex items-center gap-3 text-teal-700 dark:text-teal-300">
          <div className="rounded-2xl bg-teal-100 p-3 dark:bg-teal-900/30">
            <Ship size={20} />
          </div>
          <div>
            <p className="text-sm font-bold">Total Masuk</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dana diterima
            </p>
          </div>
        </div>
        <p className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
          {formatRupiah(income)}
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs text-teal-600 dark:text-teal-300">
          <TrendingUp size={14} />
          Berdasarkan transaksi selesai
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mb-4 flex items-center gap-3 text-rose-700 dark:text-rose-300">
          <div className="rounded-2xl bg-rose-100 p-3 dark:bg-rose-900/30">
            <Waves size={20} />
          </div>
          <div>
            <p className="text-sm font-bold">Total Keluar</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dana terpakai
            </p>
          </div>
        </div>
        <p className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
          {formatRupiah(expense)}
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-300">
          <TrendingDown size={14} />
          Termasuk kasbon aktif
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mb-4 flex items-center gap-3 text-slate-700 dark:text-slate-200">
          <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-sm font-bold">Perlu Tindakan</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pending, approved, review
            </p>
          </div>
        </div>
        <p className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
          {actionCount}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800/80">
            <Clock size={12} />
            Pending: {pendingCount}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
            Approved: {approvedCount}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
            <AlertCircle size={12} />
            Review: {reviewCount}
          </span>
        </div>
      </div>
    </div>
  );
}
