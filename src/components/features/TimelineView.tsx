import React, { useMemo } from "react";
import { Calendar, Flag, Target, AlertTriangle } from "lucide-react";
import { Task, TaskStatus, InitiativeStatus } from "@/lib/types";
import { INITIATIVES, OKRS, MILESTONES } from "@/lib/data";
import { cn, daysBetween, formatDate } from "@/lib/utils";

interface TimelineViewProps {
  tasks: Task[];
  today: string;
}

const STATUS_STYLES: Record<
  TaskStatus,
  { label: string; badge: string; progress: string }
> = {
  todo: {
    label: "To Do",
    badge:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    progress: "bg-slate-300 dark:bg-slate-600",
  },
  doing: {
    label: "Doing",
    badge:
      "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-700/40",
    progress: "bg-indigo-500",
  },
  review: {
    label: "Review",
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700/40",
    progress: "bg-amber-500",
  },
  done: {
    label: "Done",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700/40",
    progress: "bg-emerald-500",
  },
  blocked: {
    label: "Blocked",
    badge:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-700/40",
    progress: "bg-rose-500",
  },
};

const INITIATIVE_STYLES: Record<
  InitiativeStatus,
  { label: string; className: string }
> = {
  on_track: {
    label: "On Track",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700/50",
  },
  at_risk: {
    label: "At Risk",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700/50",
  },
  off_track: {
    label: "Off Track",
    className:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-700/50",
  },
};

const calcTaskProgress = (task: Task, today: string) => {
  if (task.status === "done") return 1;
  const duration = Math.max(1, daysBetween(task.start, task.due) + 1);
  const elapsed = Math.min(
    duration,
    Math.max(0, daysBetween(task.start, today) + 1),
  );
  return Math.max(0, Math.min(1, elapsed / duration));
};

const getTimingLabel = (task: Task, today: string) => {
  if (task.status === "done") return "Selesai";
  const remaining = daysBetween(today, task.due);
  if (remaining < 0) return `Telat ${Math.abs(remaining)} hari`;
  if (remaining === 0) return "Hari ini";
  return `Sisa ${remaining} hari`;
};

type InitiativeGroup = {
  id: string;
  title: string;
  owner: string;
  start?: string;
  due?: string;
  status?: InitiativeStatus;
  summary?: string;
  tasks: Task[];
  okrs: typeof OKRS;
  milestones: typeof MILESTONES;
  isUnassigned?: boolean;
};

export function TimelineView({ tasks, today }: TimelineViewProps) {
  if (tasks.length === 0)
    return (
      <div className="text-center py-10 text-slate-500 dark:text-slate-400">
        Timeline kosong.
      </div>
    );

  const grouped = useMemo(() => {
    const byInitiative = new Map<string, Task[]>();
    tasks.forEach((task) => {
      const key = task.initiativeId || "unassigned";
      if (!byInitiative.has(key)) byInitiative.set(key, []);
      byInitiative.get(key)?.push(task);
    });

    const groups: InitiativeGroup[] = INITIATIVES.map((initiative) => ({
      id: initiative.id,
      title: initiative.title,
      owner: initiative.owner,
      start: initiative.start,
      due: initiative.due,
      status: initiative.status,
      summary: initiative.summary,
      tasks: byInitiative.get(initiative.id) || [],
      okrs: OKRS.filter((okr) => okr.initiativeId === initiative.id),
      milestones: MILESTONES.filter(
        (milestone) => milestone.initiativeId === initiative.id,
      ),
    })).filter((group) => group.tasks.length > 0);

    const knownIds = new Set(INITIATIVES.map((initiative) => initiative.id));
    const extraGroups: InitiativeGroup[] = [];
    for (const [id, groupedTasks] of byInitiative.entries()) {
      if (id === "unassigned" || knownIds.has(id)) continue;
      extraGroups.push({
        id,
        title: `Inisiatif Lain (${id})`,
        owner: "System",
        tasks: groupedTasks,
        okrs: [],
        milestones: [],
      });
    }

    const unassigned = byInitiative.get("unassigned") || [];
    if (unassigned.length > 0) {
      groups.push({
        id: "unassigned",
        title: "Unlinked Tasks",
        owner: "System",
        tasks: unassigned,
        okrs: [],
        milestones: [],
        isUnassigned: true,
      });
    }

    return [...groups, ...extraGroups];
  }, [tasks]);

  return (
    <div className="space-y-6">
      {grouped.map((group) => {
        const total = group.tasks.length;
        const done = group.tasks.filter((t) => t.status === "done").length;
        const progress = total === 0 ? 0 : Math.round((done / total) * 100);
        const initiativeTone = group.status
          ? INITIATIVE_STYLES[group.status]
          : null;
        const tasksSorted = [...group.tasks].sort((a, b) =>
          a.start.localeCompare(b.start),
        );

        const okrStats = group.okrs.map((okr) => {
          const okrTasks = group.tasks.filter((task) => task.okrId === okr.id);
          const okrDone = okrTasks.filter((task) => task.status === "done")
            .length;
          const okrProgress =
            okrTasks.length === 0
              ? 0
              : Math.round((okrDone / okrTasks.length) * 100);
          return {
            ...okr,
            total: okrTasks.length,
            done: okrDone,
            progress: okrProgress,
          };
        });

        return (
          <section
            key={group.id}
            className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <Flag size={18} className="text-indigo-500" />
                  <h3 className="text-lg font-bold">{group.title}</h3>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Owner: {group.owner}
                  {group.start && group.due
                    ? ` • ${formatDate(group.start)} - ${formatDate(group.due)}`
                    : ""}
                </p>
                {group.summary && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {group.summary}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                {initiativeTone && (
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1",
                      initiativeTone.className,
                    )}
                  >
                    {initiativeTone.label}
                  </span>
                )}
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">
                  {progress}% selesai
                </span>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                    Progress Initiative
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {done} dari {total} task selesai
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {progress}%
                    </span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {group.milestones.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {group.milestones.map((milestone) => (
                        <span
                          key={milestone.id}
                          className="rounded-full border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
                        >
                          {milestone.title} • {formatDate(milestone.due)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <Target size={16} className="text-amber-500" />
                    <p className="text-xs font-semibold uppercase">OKR</p>
                  </div>
                  {okrStats.length === 0 ? (
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      Belum ada OKR yang terhubung.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {okrStats.map((okr) => (
                        <div key={okr.id} className="text-xs">
                          <p className="font-semibold text-slate-700 dark:text-slate-200">
                            {okr.title}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            {okr.target}
                          </p>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <span>
                              {okr.done}/{okr.total} task
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {okr.progress}%
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800">
                            <div
                              className="h-1.5 rounded-full bg-amber-500"
                              style={{ width: `${okr.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="relative mt-6 pl-6">
                <span className="absolute left-2 top-0 h-full w-px bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-4">
                  {tasksSorted.map((task) => {
                    const progressValue = Math.round(
                      calcTaskProgress(task, today) * 100,
                    );
                    const status = STATUS_STYLES[task.status];
                    const overdue =
                      task.status !== "done" &&
                      daysBetween(task.due, today) > 0;
                    const okr = task.okrId
                      ? OKRS.find((item) => item.id === task.okrId)
                      : null;
                    const milestone = task.milestoneId
                      ? MILESTONES.find((item) => item.id === task.milestoneId)
                      : null;

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "relative rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md dark:bg-slate-900",
                          overdue
                            ? "border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-900/10"
                            : "border-slate-200 dark:border-slate-800",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute -left-4 top-5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900",
                            overdue ? "bg-rose-500" : "bg-indigo-500",
                          )}
                        />
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                              {task.title}
                            </h4>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {task.pic} • {task.division}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {overdue && (
                              <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200">
                                <AlertTriangle size={12} />
                                Overdue
                              </span>
                            )}
                            <span
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                                status.badge,
                              )}
                            >
                              {status.label}
                            </span>
                          </div>
                        </div>

                        {(okr || milestone) && (
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            {okr && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                                OKR: {okr.title}
                              </span>
                            )}
                            {milestone && (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                                MS: {milestone.title}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar size={12} />
                          <span>{formatDate(task.start)}</span>
                          <span className="text-slate-300 dark:text-slate-600">
                            →
                          </span>
                          <span>{formatDate(task.due)}</span>
                          <span className="ml-auto font-semibold text-slate-600 dark:text-slate-300">
                            {getTimingLabel(task, today)}
                          </span>
                        </div>

                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              status.progress,
                            )}
                            style={{ width: `${progressValue}%` }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                          <span>Progress {progressValue}%</span>
                          <span>{daysBetween(task.start, task.due) + 1} hari</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
