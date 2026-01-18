// src/components/features/FinanceDetailModal.tsx
"use client";

import React from "react";
import { Transaction, TransactionStatus } from "@/lib/types";
import { cn, formatDate, formatRupiah } from "@/lib/utils";
import {
  AlertCircle,
  Anchor,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Paperclip,
  Ship,
  User,
  X,
  XCircle,
} from "lucide-react";

interface FinanceDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

const STATUS_META: Record<
  TransactionStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700/50",
  },
  approved: {
    label: "Disetujui",
    icon: CheckCircle2,
    className:
      "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-200 dark:border-cyan-700/50",
  },
  disbursed: {
    label: "Dicairkan",
    icon: Ship,
    className:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700/50",
  },
  in_review: {
    label: "Dalam Review",
    icon: AlertCircle,
    className:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-700/50",
  },
  done: {
    label: "Selesai",
    icon: Anchor,
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700/50",
  },
  rejected: {
    label: "Ditolak",
    icon: XCircle,
    className:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-700/50",
  },
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const TYPE_LABEL: Record<Transaction["type"], string> = {
  income: "Pemasukan",
  expense: "Pengeluaran",
  cash_advance: "Kasbon",
};

export function FinanceDetailModal({
  transaction,
  onClose,
}: FinanceDetailModalProps) {
  if (!transaction) return null;

  const statusMeta = STATUS_META[transaction.status];
  const StatusIcon = statusMeta.icon;
  const amount = transaction.amount_realized ?? transaction.amount_requested;
  const hasRealizedAmount = typeof transaction.amount_realized === "number";
  const attachmentCount = transaction.attachments?.length ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="sticky top-0 flex items-start justify-between gap-4 rounded-t-3xl bg-gradient-to-r from-cyan-600 to-blue-600 p-6 text-white">
          <div>
            <p className="text-sm opacity-80">Detail Transaksi</p>
            <h2 className="mt-1 text-2xl font-bold">{transaction.title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold",
                  statusMeta.className,
                )}
              >
                <StatusIcon size={14} />
                {statusMeta.label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1">
                <Calendar size={12} />
                {formatDate(transaction.date)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/15 p-2 transition hover:bg-white/25 dark:hover:bg-white/10"
            aria-label="Tutup detail"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nominal Transaksi
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                {formatRupiah(amount)}
              </p>
              {transaction.amount_returned ? (
                <p className="mt-1 text-xs text-emerald-600">
                  Dana kembali {formatRupiah(transaction.amount_returned)}
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ringkasan Aktor
              </p>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                    <User size={14} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Pemohon
                    </p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {transaction.requester}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Penyetuju
                    </p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {transaction.approver || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {transaction.type === "cash_advance" && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900/40 dark:bg-indigo-900/20">
              <h3 className="text-sm font-bold text-indigo-800 dark:text-indigo-200">
                Rincian Cash Advance
              </h3>
              <div className="mt-3 space-y-2 text-sm text-indigo-900 dark:text-indigo-100">
                <div className="flex items-center justify-between">
                  <span>Dana diajukan</span>
                  <span className="font-semibold">
                    {formatRupiah(transaction.amount_requested)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{hasRealizedAmount ? "Dana terpakai" : "Dana dicairkan"}</span>
                  <span className="font-semibold">
                    {formatRupiah(
                      hasRealizedAmount
                        ? transaction.amount_realized ?? transaction.amount_requested
                        : transaction.amount_requested,
                    )}
                  </span>
                </div>
                {transaction.amount_returned ? (
                  <div className="flex items-center justify-between border-t border-indigo-200 pt-2 text-emerald-700 dark:border-indigo-800 dark:text-emerald-300">
                    <span>Dana kembali</span>
                    <span className="font-semibold">
                      {formatRupiah(transaction.amount_returned)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Informasi Umum
              </p>
              <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                <div className="flex items-center justify-between">
                  <span>Kategori</span>
                  <span className="font-semibold">{transaction.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tipe</span>
                  <span className="font-semibold">
                    {TYPE_LABEL[transaction.type]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tanggal input</span>
                  <span className="font-semibold">
                    {formatDateTime(transaction.created_at)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Catatan
              </p>
              <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">
                {transaction.notes || "Tidak ada catatan tambahan."}
              </p>
            </div>
          </div>

          {attachmentCount > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Lampiran
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(transaction.attachments || []).map((link, index) => (
                  <a
                    key={`${link}-${index}`}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-800/40 dark:hover:bg-slate-800/70"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-cyan-600 shadow-sm dark:bg-slate-800 dark:text-cyan-300">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{link}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Buka lampiran
                      </p>
                    </div>
                    <Paperclip size={16} className="ml-auto text-slate-400" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
