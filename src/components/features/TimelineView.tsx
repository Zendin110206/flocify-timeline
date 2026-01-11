// src/components/features/TimelineView.tsx
import React from "react";
import { Task } from "@/lib/types";
import { daysBetween, formatDate, STATUS_CONFIG } from "@/lib/utils";
import { Calendar } from "lucide-react";

interface TimelineViewProps {
  tasks: Task[];
  today: string;
}

export function TimelineView({ tasks, today }: TimelineViewProps) {
  if (tasks.length === 0)
    return (
      <div className="text-center py-10 text-slate-500 dark:text-slate-400">
        Timeline kosong.
      </div>
    );

  const sortedTasks = [...tasks].sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="space-y-3">
      {sortedTasks.map((t) => {
        const isLate = t.status !== "done" && daysBetween(t.due, today) > 0;
        const config = STATUS_CONFIG[t.status];
        const duration = Math.max(1, daysBetween(t.start, t.due) + 1);

        return (
          <div
            key={t.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-500/50"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                  {t.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.pic} • {t.division} • {duration} Hari
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isLate && (
                  <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                    TELAT
                  </span>
                )}
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium border ${config.style}`}
                >
                  {config.label}
                </span>
              </div>
            </div>

            <div className="mb-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Calendar size={14} />
              <span>{formatDate(t.start)}</span>
              <span className="text-slate-300 dark:text-slate-600">→</span>
              <span>{formatDate(t.due)}</span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                className={`h-full ${
                  t.status === "done" ? "bg-emerald-500" : "bg-indigo-500"
                }`}
                style={{ width: t.status === "done" ? "100%" : "50%" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

