// src/app/finance/FinancePageClient.tsx
"use client";

import React, { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  Info,
  LayoutGrid,
  List,
  ListChecks,
  Plus,
  Search,
} from "lucide-react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { FinanceStats } from "@/components/features/FinanceStats";
import {
  FinanceAction,
  FinanceTable,
} from "@/components/features/FinanceTable";
import { FinanceInsights } from "@/components/features/FinanceInsights";
import { FinanceForm } from "@/components/features/FinanceForm";
import { FinanceDetailModal } from "@/components/features/FinanceDetailModal";
import { Modal } from "@/components/ui/Modal";
import {
  FinanceCategory,
  NotificationType,
  Transaction,
  TransactionStatus,
  TransactionType,
} from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useDialog } from "@/components/ui/DialogProvider";
import { ADMINS } from "@/lib/data";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS: FinanceCategory[] = [
  "Marketing",
  "Server",
  "Operasional",
  "Gaji",
  "Lainnya",
];

const STATUS_OPTIONS: { value: TransactionStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Disetujui" },
  { value: "disbursed", label: "Dicairkan" },
  { value: "in_review", label: "Dalam Review" },
  { value: "done", label: "Selesai" },
  { value: "rejected", label: "Ditolak" },
];

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "income", label: "Pemasukan" },
  { value: "expense", label: "Pengeluaran" },
  { value: "cash_advance", label: "Kasbon" },
];

const generateId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const getTimestamp = () => new Date().toISOString();
const buildFinanceTag = (transactionId: string) => `[finance:${transactionId}]`;

function OceanBackground() {
  const bubbles = useMemo(
    () => [
      { size: 120, left: "6%", top: "18%", duration: "18s", delay: "0s" },
      { size: 90, left: "78%", top: "22%", duration: "14s", delay: "1s" },
      { size: 70, left: "18%", top: "65%", duration: "16s", delay: "2s" },
      { size: 110, left: "64%", top: "68%", duration: "20s", delay: "0s" },
      { size: 60, left: "40%", top: "30%", duration: "12s", delay: "3s" },
      { size: 85, left: "88%", top: "55%", duration: "15s", delay: "2s" },
    ],
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />

      <div className="absolute bottom-0 left-0 right-0 h-64 opacity-40">
        <svg
          className="absolute bottom-0 h-full w-full text-cyan-300/40 dark:text-cyan-900/50"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="currentColor"
            d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,133.3C672,117,768,107,864,122.7C960,139,1056,181,1152,186.7C1248,192,1344,160,1392,144L1440,128L1440,320L0,320Z"
          />
        </svg>
        <svg
          className="absolute bottom-0 h-full w-full text-teal-200/40 dark:text-teal-900/40"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="currentColor"
            d="M0,160L48,149.3C96,139,192,117,288,128C384,139,480,181,576,186.7C672,192,768,160,864,149.3C960,139,1056,149,1152,154.7C1248,160,1344,160,1392,160L1440,160L1440,320L0,320Z"
          />
        </svg>
      </div>

      <div className="absolute inset-0 overflow-hidden">
        {bubbles.map((bubble) => (
          <div
            key={`${bubble.left}-${bubble.top}`}
            className="absolute rounded-full bg-cyan-200/20 backdrop-blur-sm"
            style={{
              width: bubble.size,
              height: bubble.size,
              left: bubble.left,
              top: bubble.top,
              animation: `float ${bubble.duration} ease-in-out infinite`,
              animationDelay: bubble.delay,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-18px) translateX(10px); }
        }
      `}</style>
    </div>
  );
}

export default function FinancePageClient() {
  const dialog = useDialog();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { transactions, balance, isLoading, refreshFinance } = useFinanceData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Transaction | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);
  const currentUser = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => undefined;
      const handler = () => onStoreChange();
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
    () =>
      typeof window === "undefined"
        ? ""
        : localStorage.getItem("flocify-user") || "",
    () => "",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    TransactionStatus | "all"
  >("all");
  const [filterType, setFilterType] = useState<TransactionType | "all">("all");
  const [filterCategory, setFilterCategory] = useState<
    FinanceCategory | "all"
  >("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<"transactions" | "insights">(
    "transactions",
  );
  const canManage = ADMINS.includes(currentUser);
  const selectedTxId = searchParams.get("tx");
  const selectedId = selectedTxId ?? selectedTransactionId;
  const selectedTransaction = useMemo(() => {
    if (!selectedId) return null;
    return transactions.find((tx) => tx.id === selectedId) ?? null;
  }, [selectedId, transactions]);
  const effectiveTab = selectedTxId ? "transactions" : activeTab;

  const notifyUsers = async (
    userIds: string[],
    message: string,
    type: NotificationType,
  ) => {
    if (userIds.length === 0) return;
    const timestamp = getTimestamp();
    const payload = userIds.map((userId) => ({
      id: generateId("n-fin"),
      user_id: userId,
      message,
      type,
      is_read: false,
      timestamp,
    }));
    const { error } = await supabase.from("notifications").insert(payload);
    if (error) {
      console.error("Finance notification error:", error);
    }
  };

  const notifyAdmins = async (message: string, type: NotificationType) => {
    const targets = ADMINS.filter((admin) => admin !== currentUser);
    await notifyUsers(targets, message, type);
  };

  const notifyRequester = async (
    requester: string,
    message: string,
    type: NotificationType,
  ) => {
    if (!requester) return;
    await notifyUsers([requester], message, type);
  };

  const handleSave = async (data: Partial<Transaction>) => {
    // Hapus properti undefined biar gak error di Supabase
    const payload: Partial<Transaction> = { ...data };
    (Object.keys(payload) as Array<keyof Transaction>).forEach((key) => {
      if (payload[key] === undefined) delete payload[key];
    });
    if (payload.approver === "") payload.approver = null;
    if (!payload.attachments) payload.attachments = [];
    if (!payload.requester && currentUser) payload.requester = currentUser;
    if (
      !payload.approver &&
      ADMINS.includes(currentUser) &&
      payload.status &&
      payload.status !== "pending"
    ) {
      payload.approver = currentUser;
    }

    if (!canManage) {
      payload.status = editingItem?.status ?? "pending";
      payload.approver = editingItem?.approver ?? null;
      payload.requester = editingItem?.requester ?? currentUser;
    }
    
    if (editingItem) {
      const { error } = await supabase
        .from("transactions")
        .update(payload)
        .eq("id", editingItem.id);
        
      if (error) {
        void dialog.alert({ title: "Gagal Update", message: error.message, tone: "danger" });
        return;
      }
    } else {
      const { data: inserted, error } = await supabase
        .from("transactions")
        .insert(payload)
        .select()
        .single();

      if (error) {
        void dialog.alert({
          title: "Gagal Simpan",
          message: error.message,
          tone: "danger",
        });
        return;
      }

      if (inserted?.id && payload.status === "pending") {
        await notifyAdmins(
          `🧾 REQUEST FINANCE: "${payload.title}" dari ${payload.requester}. ${buildFinanceTag(
            inserted.id,
          )}`,
          "warning",
        );
      }
    }

    setIsModalOpen(false);
    setEditingItem(null);
    refreshFinance(); // Refresh manual biar yakin, walau realtime udah jalan
  };

  const updateTransaction = async (
    transaction: Transaction,
    payload: Partial<Transaction>,
  ): Promise<boolean> => {
    const { error } = await supabase
      .from("transactions")
      .update(payload)
      .eq("id", transaction.id);

    if (error) {
      await dialog.alert({
        title: "Gagal Memperbarui",
        message: error.message,
        tone: "danger",
      });
      return false;
    }

    refreshFinance();
    return true;
  };

  const handleAction = async (
    transaction: Transaction,
    action: FinanceAction,
  ) => {
    if (!currentUser) {
      await dialog.alert({
        title: "Login Dibutuhkan",
        message: "Silakan login untuk melanjutkan aksi ini.",
        tone: "warning",
      });
      return;
    }

    const isRequester = transaction.requester === currentUser;
    const needsAdmin = ["approve", "reject", "disburse", "complete"].includes(
      action,
    );

    if (needsAdmin && !canManage) {
      await dialog.alert({
        title: "Akses Ditolak",
        message: "Hanya admin yang bisa menjalankan aksi ini.",
        tone: "danger",
      });
      return;
    }

    if (action === "submit_report" && !isRequester) {
      await dialog.alert({
        title: "Akses Ditolak",
        message: "Hanya pemohon yang bisa mengirim laporan.",
        tone: "danger",
      });
      return;
    }

    if (
      (action === "submit_report" || action === "complete") &&
      transaction.type === "cash_advance" &&
      !transaction.amount_realized
    ) {
      await dialog.alert({
        title: "Realisasi Dibutuhkan",
        message: "Lengkapi nominal realisasi sebelum mengirim laporan.",
        tone: "danger",
      });
      return;
    }

    if (action === "approve") {
      const confirmed = await dialog.confirm({
        title: "Setujui Transaksi",
        message: "Yakin ingin menyetujui transaksi ini?",
        confirmText: "Setujui",
      });
      if (!confirmed) return;
      const ok = await updateTransaction(transaction, {
        status: "approved",
        approver: currentUser,
      });
      if (ok) {
        await notifyRequester(
          transaction.requester,
          `✅ TRANSAKSI DISETUJUI: "${transaction.title}" oleh ${currentUser}. ${buildFinanceTag(
            transaction.id,
          )}`,
          "success",
        );
      }
      return;
    }

    if (action === "reject") {
      const reason = await dialog.prompt({
        title: "Tolak Transaksi",
        message: "Masukkan alasan penolakan.",
        inputLabel: "Alasan",
        confirmText: "Tolak",
        cancelText: "Batal",
        tone: "danger",
      });
      if (!reason) return;
      const notes = transaction.notes
        ? `${transaction.notes}\n\nPenolakan: ${reason}`
        : `Penolakan: ${reason}`;
      const ok = await updateTransaction(transaction, {
        status: "rejected",
        approver: currentUser,
        notes,
      });
      if (ok) {
        await notifyRequester(
          transaction.requester,
          `❌ TRANSAKSI DITOLAK: "${transaction.title}" oleh ${currentUser}. Alasan: ${reason}. ${buildFinanceTag(
            transaction.id,
          )}`,
          "danger",
        );
      }
      return;
    }

    if (action === "disburse") {
      const confirmed = await dialog.confirm({
        title: "Cairkan Dana",
        message: "Pastikan dana sudah ditransfer sebelum melanjutkan.",
        confirmText: "Cairkan",
      });
      if (!confirmed) return;
      const ok = await updateTransaction(transaction, {
        status: "disbursed",
        approver: currentUser,
      });
      if (ok) {
        await notifyRequester(
          transaction.requester,
          `💸 DANA DICAIRKAN: "${transaction.title}" oleh ${currentUser}. ${buildFinanceTag(
            transaction.id,
          )}`,
          "success",
        );
      }
      return;
    }

    if (action === "submit_report") {
      const confirmed = await dialog.confirm({
        title: "Kirim Laporan",
        message: "Ajukan laporan penggunaan dana untuk review admin.",
        confirmText: "Kirim",
      });
      if (!confirmed) return;
      const ok = await updateTransaction(transaction, {
        status: "in_review",
      });
      if (ok) {
        await notifyAdmins(
          `🔎 LAPORAN MASUK: "${transaction.title}" dari ${currentUser}. ${buildFinanceTag(
            transaction.id,
          )}`,
          "warning",
        );
      }
      return;
    }

    if (action === "complete") {
      const confirmed = await dialog.confirm({
        title: "Finalisasi Transaksi",
        message: "Tandai transaksi ini sebagai selesai?",
        confirmText: "Finalisasi",
      });
      if (!confirmed) return;
      const ok = await updateTransaction(transaction, {
        status: "done",
        approver: currentUser,
      });
      if (ok) {
        await notifyRequester(
          transaction.requester,
          `✅ TRANSAKSI SELESAI: "${transaction.title}" difinalisasi oleh ${currentUser}. ${buildFinanceTag(
            transaction.id,
          )}`,
          "success",
        );
      }
    }
  };

  const handleDelete = async (transaction: Transaction) => {
    if (!currentUser) {
      await dialog.alert({
        title: "Login Dibutuhkan",
        message: "Silakan login untuk melanjutkan.",
        tone: "warning",
      });
      return;
    }

    const isRequester = transaction.requester === currentUser;
    if (!canManage && !isRequester) {
      await dialog.alert({
        title: "Akses Ditolak",
        message: "Hanya pemohon atau admin yang bisa menghapus transaksi.",
        tone: "danger",
      });
      return;
    }

    if (transaction.status === "done") {
      await dialog.alert({
        title: "Tidak Bisa Dihapus",
        message: "Transaksi yang sudah selesai tidak boleh dihapus.",
        tone: "danger",
      });
      return;
    }

    const confirmed = await dialog.confirm({
      title: "Hapus Transaksi",
      message: "Transaksi ini akan dihapus permanen. Lanjutkan?",
      confirmText: "Hapus",
      cancelText: "Batal",
      tone: "danger",
    });
    if (!confirmed) return;

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", transaction.id);

    if (error) {
      await dialog.alert({
        title: "Gagal Menghapus",
        message: error.message,
        tone: "danger",
      });
      return;
    }

    refreshFinance();
  };

  const handleEdit = (item: Transaction) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    if (!currentUser) {
      void dialog.alert({
        title: "Login Dibutuhkan",
        message: "Silakan login dari Dashboard sebelum membuat transaksi baru.",
        tone: "warning",
      });
      return;
    }
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return transactions.filter((t) => {
      const matchSearch =
        query.length === 0 ||
        t.title.toLowerCase().includes(query) ||
        t.requester.toLowerCase().includes(query) ||
        (t.approver || "").toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query);
      const matchStatus = filterStatus === "all" || t.status === filterStatus;
      const matchType = filterType === "all" || t.type === filterType;
      const matchCategory =
        filterCategory === "all" || t.category === filterCategory;
      return matchSearch && matchStatus && matchType && matchCategory;
    });
  }, [
    transactions,
    searchQuery,
    filterStatus,
    filterType,
    filterCategory,
  ]);

  const actionCount = useMemo(
    () =>
      transactions.reduce(
        (count, t) =>
          count +
          (t.status === "pending" ||
          t.status === "approved" ||
          t.status === "in_review"
            ? 1
            : 0),
        0,
      ),
    [transactions],
  );

  const tabs = [
    {
      id: "transactions",
      label: "Transaksi",
      description: "Kelola approval & settlement",
      icon: ListChecks,
      badge: actionCount > 0 ? `${actionCount} perlu` : "",
    },
    {
      id: "insights",
      label: "Insight & Analitik",
      description: "Tren pengeluaran & approval",
      icon: BarChart3,
      badge: "",
    },
  ] as const;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500 dark:border-slate-800 dark:border-t-indigo-400"></div>
          <span className="text-sm font-medium">Menghitung Uang...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 text-slate-900 transition-colors dark:text-slate-100">
      <OceanBackground />

      <div className="relative mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 sm:mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 sm:text-2xl">
                Finance & Treasury
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Monitoring arus kas, approval, dan settlement transaksi.
              </p>
            </div>
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-200 transition hover:from-cyan-700 hover:to-blue-700 dark:shadow-none sm:px-5 sm:py-3"
          >
            <Plus size={18} /> Transaksi Baru
          </button>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="grid gap-2 sm:grid-cols-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = effectiveTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                      isActive
                        ? "border-cyan-500/60 bg-cyan-50 text-cyan-700 shadow-sm dark:border-cyan-400/50 dark:bg-cyan-900/30 dark:text-cyan-200"
                        : "border-transparent bg-slate-50 text-slate-600 hover:border-cyan-200 hover:bg-white dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/70 dark:hover:text-slate-100",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg",
                        isActive
                          ? "bg-cyan-600 text-white"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
                      )}
                    >
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{tab.label}</p>
                      <p className="hidden text-[11px] text-slate-500 dark:text-slate-400 lg:block">
                        {tab.description}
                      </p>
                    </div>
                    {tab.badge ? (
                      <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                        {tab.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            {effectiveTab === "transactions" ? (
              <>
                <FinanceStats balance={balance} transactions={transactions} />

                <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200">
                      <Info size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Panduan Arus Kas & Kasbon
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Biar saldo mudah dipahami dan konsisten dengan proses approval.
                      </p>
                      <div className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-500" />
                          <span>Pending/Disetujui belum mengubah saldo kas.</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-500" />
                          <span>Saldo berubah saat transaksi selesai; kasbon berkurang saat dana dicairkan.</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-500" />
                          <span>Pengembalian kasbon mengurangi total keluar saat finalisasi.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="relative flex-1">
                        <Search
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-600"
                          size={18}
                        />
                        <input
                          type="text"
                          placeholder="Cari transaksi, pemohon, approver, kategori..."
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm font-medium text-slate-700 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-cyan-900/30 sm:py-3"
                        />
                      </div>
                      <div className="flex items-center gap-2 sm:ml-auto">
                        <button
                          type="button"
                          onClick={() => setViewMode("grid")}
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition sm:h-12 sm:w-12 ${
                            viewMode === "grid"
                              ? "border-cyan-500 bg-cyan-600 text-white"
                              : "border-slate-200 bg-white text-slate-500 hover:border-cyan-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/70"
                          }`}
                          aria-label="Tampilan grid"
                        >
                          <LayoutGrid size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode("list")}
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition sm:h-12 sm:w-12 ${
                            viewMode === "list"
                              ? "border-cyan-500 bg-cyan-600 text-white"
                              : "border-slate-200 bg-white text-slate-500 hover:border-cyan-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/70"
                          }`}
                          aria-label="Tampilan tabel"
                        >
                          <List size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:justify-items-start">
                      <div className="relative w-full lg:max-w-[240px]">
                        <select
                          value={filterStatus}
                          onChange={(event) =>
                            setFilterStatus(
                              event.target.value as TransactionStatus | "all",
                            )
                          }
                          className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-slate-700 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-cyan-900/30 sm:py-3"
                        >
                          <option value="all">Semua Status</option>
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                      </div>
                      <div className="relative w-full lg:max-w-[240px]">
                        <select
                          value={filterType}
                          onChange={(event) =>
                            setFilterType(
                              event.target.value as TransactionType | "all",
                            )
                          }
                          className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-slate-700 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-cyan-900/30 sm:py-3"
                        >
                          <option value="all">Semua Tipe</option>
                          {TYPE_OPTIONS.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                      </div>
                      <div className="relative w-full lg:max-w-[240px]">
                        <select
                          value={filterCategory}
                          onChange={(event) =>
                            setFilterCategory(
                              event.target.value as FinanceCategory | "all",
                            )
                          }
                          className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-slate-700 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-cyan-900/30 sm:py-3"
                        >
                          <option value="all">Semua Kategori</option>
                          {CATEGORY_OPTIONS.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Menampilkan {filteredTransactions.length} dari{" "}
                      {transactions.length} transaksi
                    </span>
                    {canManage ? (
                      <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        Mode admin
                      </span>
                    ) : null}
                  </div>
                </div>

                <FinanceTable
                  transactions={filteredTransactions}
                  viewMode={viewMode}
                  currentUser={currentUser}
                  canManage={canManage}
                  onEdit={handleEdit}
                  onView={(transaction) => setSelectedTransactionId(transaction.id)}
                  onAction={handleAction}
                  onDelete={handleDelete}
                />
              </>
            ) : (
              <FinanceInsights transactions={transactions} balance={balance} />
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <Modal
          title={editingItem ? "Edit Transaksi" : "Catat Transaksi Baru"}
          onClose={() => setIsModalOpen(false)}
        >
          <FinanceForm
            initialData={editingItem}
            onSave={handleSave}
            onCancel={() => setIsModalOpen(false)}
            currentUser={currentUser}
          />
        </Modal>
      )}

      {selectedTransaction && (
        <FinanceDetailModal
          transaction={selectedTransaction}
          onClose={() => {
            setSelectedTransactionId(null);
            if (selectedTxId) {
              router.replace("/finance", { scroll: false });
            }
          }}
        />
      )}
    </div>
  );
}
