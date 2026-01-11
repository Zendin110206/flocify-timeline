// src/components/features/RequestInbox.tsx
import React from "react";
import Link from "next/link";
import { CalendarClock, Clock, User, ArrowUpRight } from "lucide-react";
import { Task } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export type RequestItem = {
  taskId: string;
  title: string;
  division: Task["division"];
  pic: string;
  requestedBy: string;
  requestedAt: string;
  detail: string;
  from?: string;
  to?: string;
  reason?: string;
};

interface RequestInboxProps {
  items: RequestItem[];
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function RequestInbox({ items }: RequestInboxProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
              <CalendarClock size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Deadline Request Inbox
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Semua request deadline yang menunggu approval.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            Pending: {items.length}
          </span>
        </div>
      </div>

      <div className="px-6 py-5">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            Tidak ada request deadline yang menunggu approval.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.taskId}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {item.division}
                      </span>
                      <span>PIC {item.pic}</span>
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                      {item.title}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      {item.from && item.to
                        ? `${formatDate(item.from)} -> ${formatDate(item.to)}`
                        : item.detail}
                    </span>
                    <Link
                      href={`/task/${item.taskId}`}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-300"
                    >
                      Review <ArrowUpRight size={12} />
                    </Link>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <User size={12} />
                    {item.requestedBy}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} />
                    {formatDateTime(item.requestedAt)}
                  </span>
                </div>

                {item.reason && (
                  <p className="mt-3 rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs italic text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    &quot;{item.reason}&quot;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
