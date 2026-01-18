// src/components/features/FinanceInsights.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Transaction, TransactionStatus, TransactionType } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import {
  getBaseAmount,
  getOutflowAmount,
  isOutflowTransaction,
  shouldAffectBalance,
} from "@/lib/finance";
import {
  Anchor,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Download,
  FileText,
  Layers,
  Printer,
  TrendingDown,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FinanceInsightsProps {
  transactions: Transaction[];
  balance: number;
}

const PIPELINE_STATUSES: TransactionStatus[] = ["pending", "approved"];
const APPROVAL_STATUSES: TransactionStatus[] = [
  "approved",
  "disbursed",
  "in_review",
  "done",
];

type MonthlyHighlight = { title: string; amount: number };
type MonthlySummary = {
  income: number;
  expense: number;
  net: number;
  cashAdvance: number;
  topExpense: MonthlyHighlight | null;
  topIncome: MonthlyHighlight | null;
};

type PipelineHighlight = { title: string; days: number };
type PipelineSummary = {
  averageDays: string;
  pendingCount: number;
  approvedCount: number;
  reviewCount: number;
  oldestPending: PipelineHighlight | null;
  oldestReview: PipelineHighlight | null;
};

const TYPE_LABEL: Record<TransactionType, string> = {
  income: "Pemasukan",
  expense: "Pengeluaran",
  cash_advance: "Kasbon",
};

const STATUS_LABEL: Record<TransactionStatus, string> = {
  pending: "Pending",
  approved: "Disetujui",
  disbursed: "Dicairkan",
  in_review: "Dalam Review",
  done: "Selesai",
  rejected: "Ditolak",
};

const parseDate = (value: string) => new Date(`${value}T00:00:00`);

const toISODate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const startOfWeek = (date: Date) => {
  const start = new Date(date);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
};

const formatShortDate = (value: Date) =>
  value.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

const toMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const formatMonthLabel = (key: string) =>
  new Date(`${key}-01T00:00:00`).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

const escapeCsv = (value: string | number) =>
  `"${String(value).replace(/"/g, '""')}"`;

function InsightCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  tone: "cyan" | "emerald" | "rose" | "amber";
}) {
  const tones = {
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200",
    emerald:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex items-center gap-3">
        <div className={cn("rounded-2xl p-3", tones[tone])}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {title}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>
      </div>
      <p className="mt-4 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

export function FinanceInsights({ transactions, balance }: FinanceInsightsProps) {
  const [selectedMonth, setSelectedMonth] = useState(() =>
    toMonthKey(new Date()),
  );

  const summary = useMemo(() => {
    const now = new Date();
    const last30 = new Date(now);
    last30.setDate(now.getDate() - 30);

    let burn30 = 0;
    let pipelineValue = 0;
    let cashAdvanceOutstanding = 0;
    let approvalCount = 0;
    let approvalValue = 0;

    const categoryTotals = new Map<string, number>();
    const requesterTotals = new Map<string, number>();
    const approverTotals = new Map<string, { count: number; total: number }>();

    transactions.forEach((t) => {
      const amount = getBaseAmount(t);
      const outflow = getOutflowAmount(t);
      const date = parseDate(t.date);

      if (isOutflowTransaction(t)) {
        categoryTotals.set(t.category, (categoryTotals.get(t.category) || 0) + outflow);
        requesterTotals.set(t.requester, (requesterTotals.get(t.requester) || 0) + outflow);
      }

      if (isOutflowTransaction(t) && date >= last30) {
        burn30 += outflow;
      }

      if (PIPELINE_STATUSES.includes(t.status)) {
        pipelineValue += amount;
      }

      if (t.type === "cash_advance" && ["disbursed", "in_review"].includes(t.status)) {
        cashAdvanceOutstanding += outflow;
      }

      if (t.approver && APPROVAL_STATUSES.includes(t.status)) {
        approvalCount += 1;
        approvalValue += t.type === "income" ? amount : outflow;
        const existing = approverTotals.get(t.approver) || { count: 0, total: 0 };
        existing.count += 1;
        existing.total += t.type === "income" ? amount : outflow;
        approverTotals.set(t.approver, existing);
      }
    });

    const runwayMonths =
      burn30 > 0 ? (balance / burn30).toFixed(1) : null;

    const categoryList = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const requesterList = Array.from(requesterTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const approverList = Array.from(approverTotals.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    const weekStart = startOfWeek(now);
    const weeklyKeys = Array.from({ length: 6 }, (_, idx) => {
      const start = new Date(weekStart);
      start.setDate(start.getDate() - (5 - idx) * 7);
      return toISODate(start);
    });

    const weeklyTotals = weeklyKeys.map((key) => ({
      key,
      total: 0,
      label: "",
    }));

    weeklyTotals.forEach((week) => {
      const start = parseDate(week.key);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      week.label = `${formatShortDate(start)} - ${formatShortDate(end)}`;
    });

    transactions.forEach((t) => {
      if (!isOutflowTransaction(t)) return;
      const date = parseDate(t.date);
      const weekKey = toISODate(startOfWeek(date));
      const idx = weeklyTotals.findIndex((week) => week.key === weekKey);
      if (idx >= 0) {
        weeklyTotals[idx].total += getOutflowAmount(t);
      }
    });

    const maxWeekly = Math.max(...weeklyTotals.map((week) => week.total), 1);
    const maxCategory = Math.max(...categoryList.map((c) => c[1]), 1);

    return {
      burn30,
      runwayMonths,
      pipelineValue,
      cashAdvanceOutstanding,
      approvalCount,
      approvalValue,
      categoryList,
      requesterList,
      approverList,
      weeklyTotals,
      maxWeekly,
      maxCategory,
    };
  }, [transactions, balance]);

  const monthOptions = useMemo(() => {
    const options = new Set<string>();
    transactions.forEach((t) => {
      if (t.date) options.add(t.date.slice(0, 7));
    });
    return Array.from(options).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const activeMonth = monthOptions.includes(selectedMonth)
    ? selectedMonth
    : monthOptions[0] ?? "";

  const monthlyTransactions = useMemo(() => {
    if (!activeMonth) return [];
    return transactions.filter((t) => t.date?.startsWith(activeMonth));
  }, [transactions, activeMonth]);

  const monthlySummary = useMemo<MonthlySummary>(() => {
    let income = 0;
    let expense = 0;
    let cashAdvance = 0;
    let topExpense: { title: string; amount: number } | null = null;
    let topIncome: { title: string; amount: number } | null = null;

    monthlyTransactions.forEach((t) => {
      const amount = getBaseAmount(t);
      const outflow = getOutflowAmount(t);

      if (t.type === "income" && t.status === "done") {
        income += amount;
        if (!topIncome || amount > topIncome.amount) {
          topIncome = { title: t.title, amount };
        }
      }

      if (isOutflowTransaction(t)) {
        expense += outflow;
        if (!topExpense || outflow > topExpense.amount) {
          topExpense = { title: t.title, amount: outflow };
        }
      }

      if (
        t.type === "cash_advance" &&
        ["disbursed", "in_review"].includes(t.status)
      ) {
        cashAdvance += outflow;
      }
    });

    return {
      income,
      expense,
      net: income - expense,
      cashAdvance,
      topExpense,
      topIncome,
    };
  }, [monthlyTransactions]);

  const pipelineSummary = useMemo<PipelineSummary>(() => {
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    let totalDays = 0;
    let totalCount = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let reviewCount = 0;
    let oldestPending: { title: string; days: number } | null = null;
    let oldestReview: { title: string; days: number } | null = null;

    transactions.forEach((t) => {
      if (!["pending", "approved", "in_review"].includes(t.status)) return;
      const date = parseDate(t.date);
      const days = Math.max(
        0,
        Math.floor((now.getTime() - date.getTime()) / msPerDay),
      );

      totalDays += days;
      totalCount += 1;

      if (t.status === "pending") {
        pendingCount += 1;
        if (!oldestPending || days > oldestPending.days) {
          oldestPending = { title: t.title, days };
        }
      }

      if (t.status === "approved") {
        approvedCount += 1;
      }

      if (t.status === "in_review") {
        reviewCount += 1;
        if (!oldestReview || days > oldestReview.days) {
          oldestReview = { title: t.title, days };
        }
      }
    });

    return {
      averageDays: totalCount > 0 ? (totalDays / totalCount).toFixed(1) : "0.0",
      pendingCount,
      approvedCount,
      reviewCount,
      oldestPending,
      oldestReview,
    };
  }, [transactions]);

  const handleExportCsv = () => {
    if (monthlyTransactions.length === 0) return;
    const rows = monthlyTransactions.map((t) => ({
      date: t.date,
      title: t.title,
      type: t.type,
      category: t.category,
      status: t.status,
      requester: t.requester,
      approver: t.approver ?? "",
      amount_requested: t.amount_requested ?? 0,
      amount_realized: t.amount_realized ?? "",
      amount_returned: t.amount_returned ?? "",
      net_amount: shouldAffectBalance(t)
        ? t.type === "income"
          ? getBaseAmount(t)
          : -getOutflowAmount(t)
        : 0,
    }));
    const headers = Object.keys(rows[0]);
    const lines = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) =>
        headers.map((key) => escapeCsv(row[key as keyof typeof row])).join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finance-${activeMonth}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    if (monthlyTransactions.length === 0) return;
    const title = `Laporan Finance - ${formatMonthLabel(activeMonth)}`;
    const rows = monthlyTransactions.map((t) => ({
      date: t.date,
      title: t.title,
      type: TYPE_LABEL[t.type] ?? t.type,
      category: t.category,
      status: STATUS_LABEL[t.status] ?? t.status,
      requester: t.requester,
      approver: t.approver ?? "-",
      amount: formatRupiah(
        t.type === "income" ? getBaseAmount(t) : getOutflowAmount(t),
      ),
    }));
    const reportWindow = window.open("", "_blank", "width=960,height=720");
    if (!reportWindow) return;
    reportWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            p { margin: 0 0 16px; font-size: 12px; color: #475569; }
            .summary { display: flex; gap: 16px; margin-bottom: 16px; }
            .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; flex: 1; }
            .label { font-size: 11px; color: #64748b; text-transform: uppercase; }
            .value { font-size: 16px; font-weight: bold; margin-top: 6px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>Ringkasan transaksi bulanan.</p>
          <div class="summary">
            <div class="card">
              <div class="label">Total Masuk</div>
              <div class="value">${formatRupiah(monthlySummary.income)}</div>
            </div>
            <div class="card">
              <div class="label">Total Keluar</div>
              <div class="value">${formatRupiah(monthlySummary.expense)}</div>
            </div>
            <div class="card">
              <div class="label">Netto</div>
              <div class="value">${formatRupiah(monthlySummary.net)}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Judul</th>
                <th>Tipe</th>
                <th>Kategori</th>
                <th>Status</th>
                <th>Pemohon</th>
                <th>Penyetuju</th>
                <th>Nominal</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                <tr>
                  <td>${row.date}</td>
                  <td>${row.title}</td>
                  <td>${row.type}</td>
                  <td>${row.category}</td>
                  <td>${row.status}</td>
                  <td>${row.requester}</td>
                  <td>${row.approver}</td>
                  <td>${row.amount}</td>
                </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-cyan-100 p-3 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200">
            <BarChart3 size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Insight & Analitik
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ringkasan pengeluaran, tren, dan perilaku approval.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <InsightCard
          title="Burn 30 Hari"
          subtitle="Pengeluaran 30 hari terakhir"
          value={formatRupiah(summary.burn30)}
          icon={TrendingDown}
          tone="rose"
        />
        <InsightCard
          title="Runway Estimasi"
          subtitle="Saldo / burn 30 hari"
          value={summary.runwayMonths ? `${summary.runwayMonths} bln` : "N/A"}
          icon={Anchor}
          tone="cyan"
        />
        <InsightCard
          title="Kasbon Outstanding"
          subtitle="Disbursed + in review"
          value={formatRupiah(summary.cashAdvanceOutstanding)}
          icon={Layers}
          tone="amber"
        />
        <InsightCard
          title="Approval Aktif"
          subtitle={`${summary.approvalCount} transaksi di-acc`}
          value={formatRupiah(summary.approvalValue)}
          icon={CheckCircle2}
          tone="emerald"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Laporan Bulanan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ringkasan per bulan + export CSV/PDF.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select
                  value={activeMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  disabled={monthOptions.length === 0}
                  className="appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-9 text-xs font-semibold text-slate-600 shadow-sm focus:border-indigo-300 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:opacity-60"
                >
                  {monthOptions.length === 0 && (
                    <option value="">Tidak ada data</option>
                  )}
                  {monthOptions.map((month) => (
                    <option key={month} value={month}>
                      {formatMonthLabel(month)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={monthlyTransactions.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-900/20 disabled:opacity-60"
              >
                <Download size={14} /> Export CSV
              </button>
              <button
                type="button"
                onClick={handlePrintReport}
                disabled={monthlyTransactions.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-900/20 disabled:opacity-60"
              >
                <Printer size={14} /> Print PDF
              </button>
            </div>
          </div>

          {monthlyTransactions.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Belum ada transaksi di bulan ini.
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Total Masuk
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-800 dark:text-slate-100">
                    {formatRupiah(monthlySummary.income)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Total Keluar
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-800 dark:text-slate-100">
                    {formatRupiah(monthlySummary.expense)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Netto
                  </p>
                  <p
                    className={cn(
                      "mt-2 text-lg font-bold",
                      monthlySummary.net < 0
                        ? "text-rose-600 dark:text-rose-300"
                        : "text-emerald-600 dark:text-emerald-300",
                    )}
                  >
                    {formatRupiah(monthlySummary.net)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Kasbon Aktif
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-800 dark:text-slate-100">
                    {formatRupiah(monthlySummary.cashAdvance)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Pemasukan Terbesar
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {monthlySummary.topIncome?.title || "-"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {monthlySummary.topIncome
                      ? formatRupiah(monthlySummary.topIncome.amount)
                      : "-"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Pengeluaran Terbesar
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {monthlySummary.topExpense?.title || "-"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {monthlySummary.topExpense
                      ? formatRupiah(monthlySummary.topExpense.amount)
                      : "-"}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Pipeline Aging
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Usia pending, approved, dan review.
              </p>
            </div>
            <Clock className="text-amber-500" size={18} />
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Rata-rata usia
              </p>
              <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">
                {pipelineSummary.averageDays} hari
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Pending terlama
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {pipelineSummary.oldestPending?.title || "-"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {pipelineSummary.oldestPending
                  ? `${pipelineSummary.oldestPending.days} hari`
                  : "-"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Review terlama
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {pipelineSummary.oldestReview?.title || "-"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {pipelineSummary.oldestReview
                  ? `${pipelineSummary.oldestReview.days} hari`
                  : "-"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800/80">
                Pending: {pipelineSummary.pendingCount}
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                Approved: {pipelineSummary.approvedCount}
              </span>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                Review: {pipelineSummary.reviewCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Pengeluaran 6 Minggu Terakhir
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Semua transaksi keluar (done/disbursed/in review)
              </p>
            </div>
            <CircleDollarSign className="text-emerald-500" size={18} />
          </div>
          <div className="mt-4 space-y-3">
            {summary.weeklyTotals.map((week) => (
              <div key={week.key} className="flex items-center gap-3">
                <span className="w-24 text-[11px] text-slate-500 dark:text-slate-400">
                  {week.label}
                </span>
                <div className="flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-cyan-500"
                    style={{
                      width: `${Math.max(
                        (week.total / summary.maxWeekly) * 100,
                        week.total > 0 ? 6 : 0,
                      )}%`,
                    }}
                  />
                </div>
                <span className="w-20 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {formatRupiah(week.total)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Kategori Paling Boros
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Total pengeluaran per kategori
              </p>
            </div>
            <BarChart3 className="text-rose-500" size={18} />
          </div>
          <div className="mt-4 space-y-3">
            {summary.categoryList.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Belum ada data pengeluaran.
              </p>
            )}
            {summary.categoryList.map(([category, total]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>{category}</span>
                  <span>{formatRupiah(total)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-rose-500"
                    style={{
                      width: `${Math.max(
                        (total / summary.maxCategory) * 100,
                        total > 0 ? 6 : 0,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Pemohon Terbanyak
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Total pengeluaran per orang
              </p>
            </div>
            <Users className="text-cyan-500" size={18} />
          </div>
          <div className="mt-4 space-y-3">
            {summary.requesterList.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Belum ada data pemohon.
              </p>
            )}
            {summary.requesterList.map(([name, total]) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <span>{name}</span>
                <span>{formatRupiah(total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Approval Teraktif
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Jumlah transaksi yang di-acc
              </p>
            </div>
            <CheckCircle2 className="text-emerald-500" size={18} />
          </div>
          <div className="mt-4 space-y-3">
            {summary.approverList.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Belum ada approval tercatat.
              </p>
            )}
            {summary.approverList.map(([name, info]) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <span>{name}</span>
                <span>
                  {info.count} • {formatRupiah(info.total)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Pipeline Permintaan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nilai transaksi pending + approved
              </p>
            </div>
            <Clock className="text-amber-500" size={18} />
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatRupiah(summary.pipelineValue)}
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Pantau antrian dana sebelum dicairkan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
