// src/components/features/StrikeManagerModal.tsx
import React, { useState } from "react";
import { X, ShieldCheck, AlertTriangle } from "lucide-react";
import { useDialog } from "@/components/ui/DialogProvider";

interface StrikeManagerModalProps {
  targetUser: string;
  currentStrikes: number;
  onClose: () => void;
  onConfirm: (action: "reduce_one" | "reset_all", reason: string) => void;
}

export function StrikeManagerModal({
  targetUser,
  currentStrikes,
  onClose,
  onConfirm,
}: StrikeManagerModalProps) {
  const dialog = useDialog();
  const [actionType, setActionType] = useState<"reduce_one" | "reset_all">("reduce_one");
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (!reason.trim()) {
      void dialog.alert({
        title: "Alasan Wajib Diisi",
        message: "Mohon sertakan alasan kenapa sanksi ini dikurangi/dihapus (untuk audit trail).",
        tone: "danger",
      });
      return;
    }
    onConfirm(actionType, reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-950 dark:border dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="text-emerald-500" /> Manajemen Sanksi
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Target Member</p>
            <div className="flex justify-between items-center mt-1">
              <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{targetUser}</span>
              <span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-md dark:bg-rose-900/30 dark:text-rose-400">
                Total Strike: {currentStrikes}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tindakan Pengampunan
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActionType("reduce_one")}
                className={`p-3 rounded-xl border text-sm font-semibold transition-all ${
                  actionType === "reduce_one"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400"
                }`}
              >
                Kurangi 1 Strike
                <span className="block text-[10px] font-normal mt-1 opacity-70">
                  Maafkan 1 kejadian saja.
                </span>
              </button>
              <button
                onClick={() => setActionType("reset_all")}
                className={`p-3 rounded-xl border text-sm font-semibold transition-all ${
                  actionType === "reset_all"
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400"
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400"
                }`}
              >
                Reset ke 0 (Nol)
                <span className="block text-[10px] font-normal mt-1 opacity-70">
                  Pemutihan total.
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Alasan / Dasar Keputusan (Wajib)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              rows={3}
              placeholder="Contoh: Keputusan rapat evaluasi tgl 18 Jan, sakit dengan surat dokter, dll..."
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <p>
              Tindakan ini akan tercatat di history tugas terkait sebagai &quot;Amnesty&quot;. Strike di database akan dikurangi secara permanen.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200 dark:shadow-none"
          >
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
}
