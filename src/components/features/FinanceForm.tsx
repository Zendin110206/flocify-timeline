// src/components/features/FinanceForm.tsx
import React, { useState } from "react";
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  FinanceCategory,
} from "@/lib/types";
import { ADMINS, PEOPLE } from "@/lib/data";
import { useDialog } from "@/components/ui/DialogProvider";
import { Plus, Trash2, AlertCircle } from "lucide-react";

interface FinanceFormProps {
  initialData?: Transaction | null;
  onSave: (data: Partial<Transaction>) => void;
  onCancel: () => void;
  currentUser: string;
}

const CATEGORIES: FinanceCategory[] = [
  "Marketing",
  "Server",
  "Operasional",
  "Gaji",
  "Lainnya",
];

const formatCurrencyInput = (value: string) => {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseCurrencyInput = (value: string) => {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  return Number.parseInt(digits, 10);
};

const getLocalISODate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split("T")[0];
};

export function FinanceForm({
  initialData,
  onSave,
  onCancel,
  currentUser,
}: FinanceFormProps) {
  const dialog = useDialog();
  const isAdmin = ADMINS.includes(currentUser);

  // State Form
  const [type, setType] = useState<TransactionType>(
    initialData?.type || "expense",
  );
  const [title, setTitle] = useState(initialData?.title || "");
  const [category, setCategory] = useState<FinanceCategory>(
    initialData?.category || "Operasional",
  );
  const [amountRequested, setAmountRequested] = useState(
    typeof initialData?.amount_requested === "number"
      ? formatCurrencyInput(String(initialData.amount_requested))
      : "",
  );
  const [amountRealized, setAmountRealized] = useState(
    typeof initialData?.amount_realized === "number"
      ? formatCurrencyInput(String(initialData.amount_realized))
      : "",
  );
  const [amountReturned, setAmountReturned] = useState(
    typeof initialData?.amount_returned === "number"
      ? formatCurrencyInput(String(initialData.amount_returned))
      : "",
  );
  const [status, setStatus] = useState<TransactionStatus>(
    initialData?.status || "pending",
  );
  const [requester, setRequester] = useState(
    initialData?.requester || currentUser,
  );
  const [approver, setApprover] = useState(initialData?.approver || "");
  const [date, setDate] = useState(
    initialData?.date || getLocalISODate(),
  );
  const [notes, setNotes] = useState(initialData?.notes || "");

  // State Attachments (Array of URLs)
  const [attachments, setAttachments] = useState<string[]>(
    initialData?.attachments || [],
  );
  const [newLink, setNewLink] = useState("");

  // Helper: Cek apakah ini mode edit atau baru
  const isEdit = !!initialData;
  const isCashAdvance = type === "cash_advance";

  // Handler Tambah Link Bukti
  const addAttachment = () => {
    if (!newLink.trim()) return;
    setAttachments([...attachments, newLink.trim()]);
    setNewLink("");
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !amountRequested) {
      void dialog.alert({
        title: "Data Tidak Lengkap",
        message: "Judul dan Nominal wajib diisi.",
        tone: "danger",
      });
      return;
    }

    const requestedValue = parseCurrencyInput(amountRequested);
    const realizedValue = parseCurrencyInput(amountRealized);
    const returnedValue = parseCurrencyInput(amountReturned);

    if (requestedValue === null || requestedValue <= 0) {
      void dialog.alert({
        title: "Nominal Tidak Valid",
        message: "Nominal pengajuan wajib diisi dan tidak boleh 0.",
        tone: "danger",
      });
      return;
    }

    // Validasi Cash Advance Settlement
    if (isCashAdvance && (status === "in_review" || status === "done")) {
      if (realizedValue === null || realizedValue <= 0) {
        void dialog.alert({
          title: "Realisasi Kosong",
          message: "Wajib isi nominal realisasi untuk penyelesaian kasbon.",
          tone: "danger",
        });
        return;
      }
    }

    const baseAmount = realizedValue ?? requestedValue;
    if (returnedValue !== null && returnedValue > baseAmount) {
      void dialog.alert({
        title: "Kembalian Terlalu Besar",
        message: "Nominal kembalian tidak boleh melebihi nominal transaksi.",
        tone: "danger",
      });
      return;
    }

    const payload: Partial<Transaction> = {
      id: initialData?.id, // Kalau edit, ID tetap
      title,
      category,
      type,
      amount_requested: requestedValue,
      amount_realized: realizedValue,
      amount_returned: returnedValue,
      status,
      requester,
      approver: approver ? approver : null,
      date,
      notes,
      attachments,
    };

    onSave(payload);
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      <div className="flex-1 overflow-y-auto p-6">
        <form id="finance-form" onSubmit={handleSubmit} className="space-y-5">
          {/* TIPE TRANSAKSI (Hanya bisa dipilih saat buat baru) */}
          {!isEdit && (
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl dark:bg-slate-800">
              {(["expense", "income", "cash_advance"] as TransactionType[]).map(
                (t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                      type === t
                        ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    {t.replace("_", " ")}
                  </button>
                ),
              )}
            </div>
          )}

          {/* INFO DASAR */}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Judul Transaksi
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  type === "income"
                    ? "Contoh: Dana Hibah Tahap 1"
                    : "Contoh: Beli Domain"
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as FinanceCategory)
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {isCashAdvance ? "Nominal Pengajuan (Estimasi)" : "Nominal"}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm text-slate-500">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountRequested}
                  onChange={(e) =>
                    setAmountRequested(formatCurrencyInput(e.target.value))
                  }
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* BAGIAN KHUSUS CASH ADVANCE (SETTLEMENT) */}
          {isCashAdvance &&
            (status === "disbursed" ||
              status === "in_review" ||
              status === "done") && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-900/10">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <AlertCircle size={14} /> Settlement / Realisasi
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-amber-800 dark:text-amber-300">
                      Terpakai (Real)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={amountRealized}
                      onChange={(e) =>
                        setAmountRealized(formatCurrencyInput(e.target.value))
                      }
                      className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-amber-800 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-amber-800 dark:text-amber-300">
                      Kembalian (Sisa)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={amountReturned}
                      onChange={(e) =>
                        setAmountReturned(formatCurrencyInput(e.target.value))
                      }
                      className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-amber-800 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            )}

          {/* STATUS, REQUESTER, APPROVER */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TransactionStatus)}
                disabled={!isAdmin}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold uppercase tracking-wide dark:bg-slate-800 dark:border-slate-600 dark:text-white disabled:opacity-60"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                {isCashAdvance && (
                  <option value="disbursed">Disbursed (Cair)</option>
                )}
                {isCashAdvance && (
                  <option value="in_review">In Review (Lapor)</option>
                )}
                <option value="done">Done / Paid</option>
                <option value="rejected">Rejected</option>
              </select>
              {!isAdmin && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Status diatur admin lewat tombol aksi.
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Diajukan Oleh
              </label>
              <select
                value={requester}
                onChange={(e) => setRequester(e.target.value)}
                disabled={!isAdmin}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white disabled:opacity-60"
              >
                {PEOPLE.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Disetujui Oleh
              </label>
              <select
                value={approver}
                onChange={(e) => setApprover(e.target.value)}
                disabled={!isAdmin || status === "pending"}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white disabled:opacity-60"
              >
                <option value="">Belum Ditentukan</option>
                {ADMINS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-400">
                Approver hanya relevan setelah status disetujui.
              </p>
            </div>
          </div>

          {/* BUKTI / ATTACHMENTS */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Bukti (Link GDrive/Image)
            </label>
            <div className="space-y-2">
              {attachments.map((link, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs bg-slate-50 p-2 rounded border border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                >
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 truncate text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {link}
                  </a>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  placeholder="Paste link bukti disini..."
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />
                <button
                  type="button"
                  onClick={addAttachment}
                  className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
          </div>

          {/* NOTES */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Catatan / Keterangan
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              placeholder="Keterangan tambahan..."
            />
          </div>
        </form>
      </div>

      {/* FOOTER */}
      <div className="flex gap-3 p-6 border-t border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-slate-300 bg-white py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Batal
        </button>
        <button
          type="submit"
          form="finance-form"
          className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-500"
        >
          Simpan Transaksi
        </button>
      </div>
    </div>
  );
}
