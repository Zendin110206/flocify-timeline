// src/lib/utils.ts
import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { TaskStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayISO() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysBetween(aISO: string, bISO: string) {
  const a = new Date(aISO);
  const b = new Date(bISO);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

// --- FUNGSI BARU: FORMAT RUPIAH ---
export function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0, // Gak usah pake ,00 di belakang biar bersih
    maximumFractionDigits: 0,
  }).format(amount);
}

// CONFIG WARNA STATUS TASK (LAMA)
export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; style: string }
> = {
  todo: {
    label: "To Do",
    style:
      "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
  },
  doing: {
    label: "Doing",
    style:
      "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  },
  review: {
    label: "Review",
    style:
      "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  },
  done: {
    label: "Done",
    style:
      "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  },
  blocked: {
    label: "Blocked",
    style:
      "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800",
  },
};
