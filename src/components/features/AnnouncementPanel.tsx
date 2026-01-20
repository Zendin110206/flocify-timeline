import React from "react";
import { Megaphone, AlertTriangle, Info, X } from "lucide-react";
import { AppNotification } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AnnouncementPanelProps {
  announcements: AppNotification[];
  canPost: boolean;
  onPost: () => void;
  onDismiss: (id: string) => void;
}

const TONE_STYLES: Record<
  AppNotification["type"],
  { icon: React.ElementType; className: string }
> = {
  info: {
    icon: Info,
    className:
      "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-200 dark:border-cyan-700/50",
  },
  success: {
    icon: Info,
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700/50",
  },
  warning: {
    icon: AlertTriangle,
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700/50",
  },
  danger: {
    icon: AlertTriangle,
    className:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-700/50",
  },
};

export function AnnouncementPanel({
  announcements,
  canPost,
  onPost,
  onDismiss,
}: AnnouncementPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
            <Megaphone size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Pengumuman Penting
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Info prioritas yang perlu dibaca tim.
            </p>
          </div>
        </div>
        {canPost && (
          <button
            type="button"
            onClick={onPost}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Tambah Pengumuman
          </button>
        )}
      </div>

      <div className="space-y-3 px-6 py-5">
        {announcements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            Belum ada pengumuman aktif.
          </div>
        ) : (
          announcements.map((item) => {
            const tone = TONE_STYLES[item.type];
            const ToneIcon = tone.icon;
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-start justify-between gap-4 rounded-xl border p-4 text-sm",
                  tone.className,
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 text-slate-700 shadow-sm dark:bg-slate-900/40 dark:text-slate-200">
                    <ToneIcon size={16} />
                  </div>
                  <div>
                    <p className="font-semibold">{item.message}</p>
                    <p className="mt-1 text-[11px] opacity-70">
                      {new Date(item.timestamp).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDismiss(item.id)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Sembunyikan"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
