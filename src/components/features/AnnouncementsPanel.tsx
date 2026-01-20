"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Plus,
  Trash2,
} from "lucide-react";
import { Announcement, NotificationType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { useDialog } from "@/components/ui/DialogProvider";
import { supabase } from "@/lib/supabase";

type AnnouncementsPanelProps = {
  announcements: Announcement[];
  isLoading: boolean;
  currentUser: string;
  isAdmin: boolean;
  onRefresh: () => void;
};

const TONE_META: Record<
  NotificationType,
  { icon: React.ElementType; className: string }
> = {
  info: {
    icon: Info,
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200",
  },
  success: {
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200",
  },
  warning: {
    icon: AlertCircle,
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200",
  },
  danger: {
    icon: AlertTriangle,
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-200",
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

const resolveActive = (announcement: Announcement, now: Date) => {
  if (!announcement.is_active) return false;
  if (announcement.starts_at) {
    if (new Date(announcement.starts_at).getTime() > now.getTime()) return false;
  }
  if (announcement.ends_at) {
    if (new Date(announcement.ends_at).getTime() < now.getTime()) return false;
  }
  return true;
};

export function AnnouncementsPanel({
  announcements,
  isLoading,
  currentUser,
  isAdmin,
  onRefresh,
}: AnnouncementsPanelProps) {
  const dialog = useDialog();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<NotificationType>("info");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const activeAnnouncements = useMemo(() => {
    const now = new Date();
    return announcements.filter((item) => resolveActive(item, now));
  }, [announcements]);

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setTone("info");
    setStartsAt("");
    setEndsAt("");
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !message.trim()) {
      await dialog.alert({
        title: "Data Tidak Lengkap",
        message: "Judul dan isi pengumuman wajib diisi.",
        tone: "danger",
      });
      return;
    }

    if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
      await dialog.alert({
        title: "Tanggal Tidak Valid",
        message: "Akhir pengumuman tidak boleh lebih awal dari mulai.",
        tone: "danger",
      });
      return;
    }

    const payload = {
      id: `ann-${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      tone,
      is_active: true,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      created_by: currentUser || "SYSTEM",
    };

    const { error } = await supabase.from("announcements").insert(payload);
    if (error) {
      await dialog.alert({
        title: "Gagal Menyimpan",
        message: error.message,
        tone: "danger",
      });
      return;
    }

    resetForm();
    setIsModalOpen(false);
    onRefresh();
  };

  const handleArchive = async (announcement: Announcement) => {
    const confirmed = await dialog.confirm({
      title: "Arsipkan Pengumuman",
      message: "Pengumuman ini akan disembunyikan dari dashboard. Lanjutkan?",
      confirmText: "Arsipkan",
      cancelText: "Batal",
      tone: "warning",
    });
    if (!confirmed) return;
    const { error } = await supabase
      .from("announcements")
      .update({ is_active: false, ends_at: new Date().toISOString() })
      .eq("id", announcement.id);
    if (error) {
      await dialog.alert({
        title: "Gagal Mengarsipkan",
        message: error.message,
        tone: "danger",
      });
      return;
    }
    onRefresh();
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Pengumuman Penting
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Informasi terbaru yang wajib diketahui tim.
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              <Plus size={14} /> Buat Pengumuman
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 px-6 py-5">
        {isLoading ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            Memuat pengumuman...
          </div>
        ) : activeAnnouncements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            Belum ada pengumuman aktif.
          </div>
        ) : (
          activeAnnouncements.map((item) => {
            const meta = TONE_META[item.tone];
            const Icon = meta.icon;
            return (
              <div
                key={item.id}
                className={cn(
                  "flex flex-wrap items-start justify-between gap-3 rounded-xl border px-4 py-3",
                  meta.className,
                )}
              >
                <div className="flex flex-1 items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-slate-600 dark:bg-slate-900">
                    <Icon size={16} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold">{item.title}</p>
                    <p className="text-xs whitespace-pre-line">{item.message}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                      <span>Oleh {item.created_by}</span>
                      <span>- {formatDateTime(item.created_at)}</span>
                      {item.ends_at && (
                        <span>- Aktif sampai {formatDateTime(item.ends_at)}</span>
                      )}
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleArchive(item)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-rose-700 dark:hover:bg-rose-900/20"
                  >
                    <Trash2 size={12} /> Arsip
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <Modal title="Buat Pengumuman" onClose={() => setIsModalOpen(false)}>
          <form id="announcement-form" onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Judul
              </label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                placeholder="Contoh: Sprint 2 dimulai Senin"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Isi Pengumuman
              </label>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                placeholder="Tulis detail yang harus diketahui tim..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Tone
                </label>
                <select
                  value={tone}
                  onChange={(event) =>
                    setTone(event.target.value as NotificationType)
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="danger">Danger</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Mulai (opsional)
                </label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Berakhir (opsional)
              </label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </form>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 rounded-lg border border-slate-300 bg-white py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              form="announcement-form"
              className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Publikasikan
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
