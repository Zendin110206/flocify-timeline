// src/components/features/FinanceTable.tsx
import React from "react";
import { Transaction, TransactionStatus, TransactionType } from "@/lib/types";
import { cn, formatDate, formatRupiah } from "@/lib/utils";
import {
  AlertCircle,
  Anchor,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  FileText,
  Fish,
  Ship,
  Trash2,
  Waves,
  XCircle,
} from "lucide-react";

export type FinanceAction =
  | "approve"
  | "reject"
  | "disburse"
  | "submit_report"
  | "complete";

interface FinanceTableProps {
  transactions: Transaction[];
  viewMode: "grid" | "list";
  currentUser: string;
  canManage: boolean;
  onEdit: (t: Transaction) => void;
  onView: (t: Transaction) => void;
  onAction: (t: Transaction, action: FinanceAction) => void;
  onDelete: (t: Transaction) => void;
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

const STATUS_ACCENT: Record<TransactionStatus, string> = {
  pending:
    "border-amber-200/70 shadow-amber-200/40 dark:ring-1 dark:ring-amber-500/20",
  approved:
    "border-cyan-200/70 shadow-cyan-200/40 dark:ring-1 dark:ring-cyan-500/20",
  disbursed:
    "border-purple-200/70 shadow-purple-200/40 dark:ring-1 dark:ring-purple-500/20",
  in_review:
    "border-orange-200/70 shadow-orange-200/40 dark:ring-1 dark:ring-orange-500/20",
  done:
    "border-emerald-200/70 shadow-emerald-200/40 dark:ring-1 dark:ring-emerald-500/20",
  rejected:
    "border-rose-200/70 shadow-rose-200/40 dark:ring-1 dark:ring-rose-500/20",
};

const STATUS_BADGE_BASE =
  "inline-flex min-w-[120px] items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm sm:text-xs";

const TYPE_META: Record<TransactionType, { label: string; className: string }> =
  {
    income: {
      label: "Pemasukan",
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700/50",
    },
    expense: {
      label: "Pengeluaran",
      className:
        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-700/50",
    },
    cash_advance: {
      label: "Kasbon",
      className:
        "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-700/50",
    },
  };

const TYPE_BADGE_BASE =
  "inline-flex min-w-[96px] items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold";

const CATEGORY_ICON: Record<string, React.ElementType> = {
  Marketing: Fish,
  Server: Ship,
  Operasional: Waves,
  Gaji: Anchor,
  Lainnya: FileText,
};

const getInitial = (name: string) => name?.slice(0, 1).toUpperCase() || "-";

function DatePill({ date }: { date: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200">
      <Calendar size={12} />
      {formatDate(date)}
    </span>
  );
}

function StatusBadge({ status }: { status: TransactionStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        STATUS_BADGE_BASE,
        meta.className,
      )}
    >
      <Icon size={14} />
      {meta.label}
    </span>
  );
}

type ActionButtonsProps = {
  transaction: Transaction;
  currentUser: string;
  canManage: boolean;
  compact?: boolean;
  onEdit: (t: Transaction) => void;
  onView: (t: Transaction) => void;
  onAction: (t: Transaction, action: FinanceAction) => void;
  onDelete: (t: Transaction) => void;
};

function ActionButtons({
  transaction,
  currentUser,
  canManage,
  compact = false,
  onEdit,
  onView,
  onAction,
  onDelete,
}: ActionButtonsProps) {
  const isRequester = currentUser === transaction.requester;
  const isLocked = transaction.status === "done";
  const canEdit = (canManage || isRequester) && !isLocked;
  const canDelete = (canManage || isRequester) && !isLocked;

  const primaryActions: Array<{
    label: string;
    icon: React.ElementType;
    onClick: () => void;
    className: string;
  }> = [];

  if (canManage && transaction.status === "pending") {
    primaryActions.push(
      {
        label: "Setujui",
        icon: CheckCircle2,
        onClick: () => onAction(transaction, "approve"),
        className:
          "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20",
      },
      {
        label: "Tolak",
        icon: XCircle,
        onClick: () => onAction(transaction, "reject"),
        className:
          "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-500/20",
      },
    );
  }

  if (
    canManage &&
    transaction.status === "approved" &&
    transaction.type === "cash_advance"
  ) {
    primaryActions.push({
      label: "Cairkan Dana",
      icon: Ship,
      onClick: () => onAction(transaction, "disburse"),
      className:
        "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20",
    });
  }

  if (
    canManage &&
    transaction.status === "approved" &&
    transaction.type !== "cash_advance"
  ) {
    primaryActions.push({
      label: "Finalisasi",
      icon: Anchor,
      onClick: () => onAction(transaction, "complete"),
      className:
        "bg-teal-600 text-white hover:bg-teal-700 shadow-teal-500/20",
    });
  }

  if (
    isRequester &&
    transaction.status === "disbursed" &&
    transaction.type === "cash_advance"
  ) {
    primaryActions.push({
      label: "Kirim Laporan",
      icon: AlertCircle,
      onClick: () => onAction(transaction, "submit_report"),
      className:
        "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20",
    });
  }

  if (canManage && transaction.status === "in_review") {
    primaryActions.push({
      label: "Finalisasi",
      icon: Anchor,
      onClick: () => onAction(transaction, "complete"),
      className:
        "bg-teal-600 text-white hover:bg-teal-700 shadow-teal-500/20",
    });
  }

  const secondaryActions: Array<{
    label: string;
    icon: React.ElementType;
    onClick: () => void;
    tone?: "danger";
  }> = [
    { label: "Detail", icon: Eye, onClick: () => onView(transaction) },
  ];

  if (canEdit) {
    secondaryActions.push({
      label: "Edit",
      icon: Edit2,
      onClick: () => onEdit(transaction),
    });
  }

  if (canDelete) {
    secondaryActions.push({
      label: "Hapus",
      icon: Trash2,
      onClick: () => onDelete(transaction),
      tone: "danger",
    });
  }

  const renderPrimary = (
    action: (typeof primaryActions)[number],
    fullWidth: boolean,
  ) => {
    const Icon = action.icon;
    return (
      <button
        key={action.label}
        type="button"
        onClick={action.onClick}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition hover:shadow-md sm:py-2.5 sm:text-sm",
          fullWidth ? "w-full" : "",
          action.className,
        )}
      >
        <Icon size={16} />
        {action.label}
      </button>
    );
  };

  const renderSecondary = (action: (typeof secondaryActions)[number]) => {
    const Icon = action.icon;
    return (
      <button
        key={action.label}
        type="button"
        onClick={action.onClick}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition",
          action.tone === "danger"
            ? "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200 dark:hover:bg-rose-900/50"
            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700/70",
        )}
      >
        <Icon size={14} />
        {action.label}
      </button>
    );
  };

  if (compact) {
    return (
      <div className="flex flex-wrap justify-end gap-2">
        {primaryActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm transition",
                action.className,
              )}
              title={action.label}
              aria-label={action.label}
            >
              <Icon size={16} />
            </button>
          );
        })}
        {secondaryActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg border transition",
                action.tone === "danger"
                  ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200 dark:hover:border-rose-700 dark:hover:bg-rose-900/50"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700/70",
              )}
              title={action.label}
              aria-label={action.label}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>
    );
  }

  const hasMultiplePrimary = primaryActions.length > 1;
  return (
    <div className="flex flex-col gap-3">
      {primaryActions.length > 0 && (
        <div
          className={cn(
            "grid gap-2",
            hasMultiplePrimary ? "sm:grid-cols-2" : "",
          )}
        >
          {primaryActions.map((action) =>
            renderPrimary(action, !hasMultiplePrimary),
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {secondaryActions.map((action) => renderSecondary(action))}
      </div>
    </div>
  );
}

export function FinanceTable({
  transactions,
  viewMode,
  currentUser,
  canManage,
  onEdit,
  onView,
  onAction,
  onDelete,
}: FinanceTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white/70 p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
        Belum ada transaksi yang sesuai filter.
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold sm:px-6 sm:py-4">
                  Transaksi
                </th>
                <th className="hidden px-6 py-4 font-semibold text-center lg:table-cell w-32">
                  Tipe
                </th>
                <th className="px-4 py-3 font-semibold sm:px-6 sm:py-4">
                  Nominal
                </th>
                <th className="px-4 py-3 font-semibold text-center sm:px-6 sm:py-4 w-36">
                  Status
                </th>
                <th className="hidden px-6 py-4 font-semibold md:table-cell">
                  Pemohon
                </th>
                <th className="hidden px-6 py-4 font-semibold lg:table-cell">
                  Penyetuju
                </th>
                <th className="px-4 py-3 font-semibold text-right sm:px-6 sm:py-4">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.map((t) => {
                const amount = t.amount_realized ?? t.amount_requested;
                const returned = t.amount_returned ?? 0;
                const attachmentCount = t.attachments?.length ?? 0;
                const TypeBadge = TYPE_META[t.type];
                const CategoryIcon = CATEGORY_ICON[t.category] || FileText;

                return (
                  <tr
                    key={t.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/70 transition-colors"
                >
                    <td className="px-4 py-3 sm:px-6 sm:py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                          <CategoryIcon size={18} />
                        </div>
                        <div className="space-y-2">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">
                            {t.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <DatePill date={t.date} />
                            <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {t.category}
                            </span>
                            <span
                              className={cn(
                                "lg:hidden",
                                TYPE_BADGE_BASE,
                                TypeBadge.className,
                              )}
                            >
                              {TypeBadge.label}
                            </span>
                            {attachmentCount > 0 && (
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                {attachmentCount} lampiran
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 md:hidden dark:text-slate-400">
                            <span>
                              <span className="uppercase">Pemohon:</span>{" "}
                              <strong>{t.requester}</strong>
                            </span>
                            <span>
                              <span className="uppercase">Penyetuju:</span>{" "}
                              <strong>{t.approver || "-"}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-6 py-4 text-center lg:table-cell">
                      <span
                        className={cn(
                          TYPE_BADGE_BASE,
                          TypeBadge.className,
                        )}
                      >
                        {TypeBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        {formatRupiah(amount)}
                      </p>
                      {returned > 0 && (
                        <p className="text-xs text-emerald-600">
                          Kembali {formatRupiah(returned)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center sm:px-6 sm:py-4">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="hidden px-6 py-4 text-sm text-slate-600 dark:text-slate-300 md:table-cell">
                      {t.requester}
                    </td>
                    <td className="hidden px-6 py-4 text-sm text-slate-600 dark:text-slate-300 lg:table-cell">
                      {t.approver || "-"}
                    </td>
                    <td className="px-4 py-3 text-right sm:px-6 sm:py-4 min-w-[200px]">
                      <ActionButtons
                        transaction={t}
                        currentUser={currentUser}
                        canManage={canManage}
                        compact
                        onEdit={onEdit}
                        onView={onView}
                        onAction={onAction}
                        onDelete={onDelete}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {transactions.map((t) => {
        const amount = t.amount_realized ?? t.amount_requested;
        const returned = t.amount_returned ?? 0;
        const attachmentCount = t.attachments?.length ?? 0;
        const CategoryIcon = CATEGORY_ICON[t.category] || FileText;
        const typeBadge = TYPE_META[t.type];

        const approverLabel = t.approver || "-";
        const approverBadgeClass = t.approver
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";

        return (
          <div
            key={t.id}
            className={cn(
              "group flex h-full flex-col rounded-3xl border bg-white p-4 shadow-sm transition sm:p-6 dark:border-slate-800 dark:bg-slate-900",
              STATUS_ACCENT[t.status],
            )}
          >
            <div className="flex flex-1 flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 sm:h-12 sm:w-12">
                    <CategoryIcon size={18} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <DatePill date={t.date} />
                      {attachmentCount > 0 && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {attachmentCount} lampiran
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 sm:text-base">
                      {t.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {t.category}
                      </span>
                      <span
                        className={cn(
                          TYPE_BADGE_BASE,
                          typeBadge.className,
                        )}
                      >
                        {typeBadge.label}
                      </span>
                    </div>
                  </div>
                </div>
                <StatusBadge status={t.status} />
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Nominal Transaksi
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                  {formatRupiah(amount)}
                </p>
                {returned > 0 && (
                  <p className="mt-1 text-xs font-semibold text-emerald-600">
                    Dana kembali {formatRupiah(returned)}
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200">
                    {getInitial(t.requester)}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                      Pemohon
                    </p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {t.requester}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold",
                      approverBadgeClass,
                    )}
                  >
                    {getInitial(approverLabel)}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                      Penyetuju
                    </p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {approverLabel}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
              <ActionButtons
                transaction={t}
                currentUser={currentUser}
                canManage={canManage}
                onEdit={onEdit}
                onView={onView}
                onAction={onAction}
                onDelete={onDelete}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
