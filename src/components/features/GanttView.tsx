// src/components/features/GanttView.tsx
import React, { useMemo } from "react";
import { Task } from "@/lib/types";
import { STATUS_CONFIG, cn, formatDate } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

interface GanttViewProps {
  tasks: Task[];
  today: string;
}

type DayItem = {
  iso: string;
  label: string;
  weekday: string;
  isWeekend: boolean;
};

const DAY_WIDTH = 44;
const MIN_RANGE_DAYS = 7;
const LEFT_COL_WIDTH = 280;

const toISODate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseISODate = (iso: string) => new Date(`${iso}T00:00:00`);

const diffDays = (fromISO: string, toISO: string) => {
  const from = parseISODate(fromISO);
  const to = parseISODate(toISO);
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

const addDays = (iso: string, days: number) => {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
};

const buildRange = (tasks: Task[], today: string) => {
  if (tasks.length === 0) {
    return { rangeStart: today, rangeEnd: today };
  }
  const start = tasks.reduce(
    (min, t) => (t.start < min ? t.start : min),
    tasks[0].start
  );
  const end = tasks.reduce(
    (max, t) => (t.due > max ? t.due : max),
    tasks[0].due
  );
  let rangeStart = start;
  let rangeEnd = end;

  if (today < rangeStart) rangeStart = today;
  if (today > rangeEnd) rangeEnd = today;

  const currentRange = diffDays(rangeStart, rangeEnd) + 1;
  if (currentRange < MIN_RANGE_DAYS) {
    rangeEnd = addDays(rangeStart, MIN_RANGE_DAYS - 1);
  }

  return { rangeStart, rangeEnd };
};

const buildDays = (start: string, end: string) => {
  const days: DayItem[] = [];
  const totalDays = diffDays(start, end);
  for (let i = 0; i <= totalDays; i += 1) {
    const iso = addDays(start, i);
    const date = parseISODate(iso);
    const weekday = date.toLocaleDateString("id-ID", { weekday: "short" });
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const label = date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
    days.push({ iso, label, weekday, isWeekend });
  }
  return days;
};

export function GanttView({ tasks, today }: GanttViewProps) {
  const sortedTasks = useMemo(
    () =>
      [...tasks].sort(
        (a, b) =>
          a.start.localeCompare(b.start) || a.due.localeCompare(b.due)
      ),
    [tasks]
  );
  const overdueCount = useMemo(
    () => sortedTasks.filter((t) => t.status !== "done" && t.due < today).length,
    [sortedTasks, today]
  );
  const overlapsById = useMemo(() => {
    const overlaps = new Map<string, boolean>();
    for (let i = 0; i < sortedTasks.length; i += 1) {
      for (let j = i + 1; j < sortedTasks.length; j += 1) {
        const a = sortedTasks[i];
        const b = sortedTasks[j];
        if (a.pic !== b.pic) continue;
        const isOverlap = a.start <= b.due && a.due >= b.start;
        if (isOverlap) {
          overlaps.set(a.id, true);
          overlaps.set(b.id, true);
        }
      }
    }
    return overlaps;
  }, [sortedTasks]);

  const { rangeStart, rangeEnd } = useMemo(
    () => buildRange(sortedTasks, today),
    [sortedTasks, today]
  );
  const days = useMemo(() => buildDays(rangeStart, rangeEnd), [
    rangeStart,
    rangeEnd,
  ]);
  const todayIndex = days.findIndex((d) => d.iso === today);
  const gridWidth = days.length * DAY_WIDTH;
  const todayLeft = todayIndex >= 0 ? todayIndex * DAY_WIDTH : 0;
  const overlapCount = overlapsById.size;

  if (tasks.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500 dark:text-slate-400">
        Calendar kosong.
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    todo: "bg-slate-400/70 border-slate-400/70",
    doing: "bg-indigo-500/80 border-indigo-500/80",
    review: "bg-amber-500/80 border-amber-500/80",
    done: "bg-emerald-500/80 border-emerald-500/80",
    blocked: "bg-rose-500/80 border-rose-500/80",
  };
  const statusDots: Record<string, string> = {
    todo: "bg-slate-400",
    doing: "bg-indigo-500",
    review: "bg-amber-500",
    done: "bg-emerald-500",
    blocked: "bg-rose-500",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <CalendarDays size={18} className="text-indigo-500" />
            <h3 className="text-lg font-bold">Calendar (Gantt)</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Range: {formatDate(rangeStart)} - {formatDate(rangeEnd)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Total: {tasks.length}
          </span>
          <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
            Overdue: {overdueCount}
          </span>
          <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Overlap PIC: {overlapCount}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: gridWidth + LEFT_COL_WIDTH }}>
          <div className="sticky top-0 z-20 flex border-b border-slate-100 bg-slate-50/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <div
              className="sticky left-0 z-30 shrink-0 border-r border-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400"
              style={{ width: LEFT_COL_WIDTH }}
            >
              Task
            </div>
            <div className="relative flex" style={{ width: gridWidth }}>
              {days.map((day) => {
                const isToday = day.iso === today;
                return (
                  <div
                    key={day.iso}
                    className={cn(
                      "flex h-12 flex-col items-center justify-center gap-0.5 border-r border-slate-100 text-[10px] font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400",
                      day.isWeekend &&
                        "bg-slate-100/60 dark:bg-slate-900/60",
                      isToday &&
                        "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400"
                    )}
                    style={{ width: DAY_WIDTH }}
                  >
                    <span className="text-[9px] uppercase tracking-wide">
                      {day.weekday}
                    </span>
                    <span className="text-xs font-semibold">{day.label}</span>
                  </div>
                );
              })}
              {todayIndex >= 0 && (
                <div
                  className="absolute top-0 h-full w-0.5 bg-rose-400/70 shadow-[0_0_8px_rgba(244,63,94,0.35)]"
                  style={{ left: todayLeft + DAY_WIDTH / 2 - 1 }}
                />
              )}
            </div>
          </div>

          <div className="border-b border-slate-100 px-6 py-3 text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-3">
              <span className="uppercase tracking-widest text-[9px] text-slate-400">
                Legend
              </span>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <span
                  key={key}
                  className="flex items-center gap-1 whitespace-nowrap"
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      statusDots[key]
                    )}
                  />
                  {config.label}
                </span>
              ))}
              <span className="ml-auto flex items-center gap-2 text-rose-500">
                <span className="h-3 w-0.5 rounded-full bg-rose-400" />
                Today
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedTasks.map((task, index) => {
              const offset = Math.max(0, diffDays(rangeStart, task.start));
              const duration = Math.max(1, diffDays(task.start, task.due) + 1);
              const width = duration * DAY_WIDTH;
              const isOverdue = task.status !== "done" && task.due < today;
              const hasOverlap = overlapsById.get(task.id);
              const label = `${task.title} (${formatDate(
                task.start
              )} - ${formatDate(task.due)})`;
              const rowBg =
                index % 2 === 0
                  ? "bg-white dark:bg-slate-900"
                  : "bg-slate-50/70 dark:bg-slate-900/40";

              return (
                <div key={task.id} className={cn("flex", rowBg)}>
                  <div
                    className="sticky left-0 z-10 shrink-0 border-r border-slate-100 p-4 dark:border-slate-800"
                    style={{ width: LEFT_COL_WIDTH }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">
                          {task.title}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {task.division}
                          </span>
                          <span className="font-medium">{task.pic}</span>
                          <span>{duration} hari</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={cn(
                            "min-w-14.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold text-center whitespace-nowrap",
                            STATUS_CONFIG[task.status].style
                          )}
                        >
                          {STATUS_CONFIG[task.status].label}
                        </span>
                        {isOverdue && (
                          <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">
                      {formatDate(task.start)} - {formatDate(task.due)}
                    </p>
                    {hasOverlap && (
                      <span className="mt-2 inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Overlap PIC
                      </span>
                    )}
                  </div>

                  <div className="relative h-18" style={{ width: gridWidth }}>
                    <div className="absolute inset-0 flex">
                      {days.map((day) => (
                        <div
                          key={`${task.id}-${day.iso}`}
                          className={cn(
                            "h-full border-r border-slate-100 dark:border-slate-800",
                            day.isWeekend &&
                              "bg-slate-100/50 dark:bg-slate-900/50"
                          )}
                          style={{ width: DAY_WIDTH }}
                        />
                      ))}
                    </div>

                    {todayIndex >= 0 && (
                      <div
                        className="absolute inset-y-0 bg-rose-50/40 dark:bg-rose-900/10"
                        style={{ left: todayLeft, width: DAY_WIDTH }}
                      />
                    )}

                    {todayIndex >= 0 && (
                      <div
                        className="absolute top-0 h-full w-0.5 bg-rose-400/40"
                        style={{ left: todayLeft + DAY_WIDTH / 2 - 1 }}
                      />
                    )}

                    <div
                      className={cn(
                        "absolute top-1/2 flex h-7 -translate-y-1/2 items-center rounded-lg border px-2 text-[11px] font-semibold text-white shadow-sm",
                        statusColors[task.status],
                        isOverdue && "ring-2 ring-rose-500/30",
                        hasOverlap && "ring-2 ring-rose-400/40"
                      )}
                      style={{ left: offset * DAY_WIDTH, width }}
                      title={label}
                    >
                      <span className="truncate">{task.title}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


