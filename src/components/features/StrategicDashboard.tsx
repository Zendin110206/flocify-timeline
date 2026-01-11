// src/components/features/StrategicDashboard.tsx
import React, { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Flame,
  Globe,
  Shield,
  Target,
  Truck,
  TrendingUp,
} from "lucide-react";
import { Task } from "@/lib/types";
import { cn, daysBetween, todayISO } from "@/lib/utils";
import { HQ_METRICS, HQ_PILLARS } from "@/lib/data";

interface StrategicDashboardProps {
  tasks: Task[];
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat("id-ID").format(value);
const formatCurrency = (value: number) => `Rp ${formatNumber(value)}`;
const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export function StrategicDashboard({ tasks }: StrategicDashboardProps) {
  const today = todayISO();

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const marketTask = useMemo(
    () =>
      tasks.find(
        (task) =>
          task.pic === "Erpan" &&
          task.title.toLowerCase().includes("market validation")
      ),
    [tasks]
  );

  const marketCompleted = marketTask
    ? marketTask.subtasks.filter((sub) => sub.isCompleted).length
    : 0;
  const marketTarget = HQ_METRICS.marketValidationTarget;
  const marketPercent = Math.round(
    (Math.min(marketCompleted, marketTarget) / marketTarget) * 100
  );
  const marketCritical = marketCompleted < marketTarget;

  const transactionPercent = Math.round(
    (HQ_METRICS.transactionCurrent / HQ_METRICS.transactionGoal) * 100
  );
  const noRevenue = HQ_METRICS.transactionCurrent === 0;

  const somPercent = Math.round(
    (HQ_METRICS.somCurrent / HQ_METRICS.somTarget) * 100
  );

  const daysLeft = Math.max(0, daysBetween(today, HQ_METRICS.burnDeadline));
  const monthlyBurn =
    HQ_METRICS.burnMonthly.server + HQ_METRICS.burnMonthly.marketing;
  const dailyBurn = Math.round(monthlyBurn / 30);
  const burnEstimate = Math.round(dailyBurn * daysLeft);
  const burnProgress = clamp(
    1 - daysLeft / HQ_METRICS.burnWindowDays
  );

  const doneCount = tasks.filter((task) => task.status === "done").length;
  const earliestStart = tasks.reduce(
    (min, task) => (task.start < min ? task.start : min),
    today
  );
  const activeDays = Math.max(1, daysBetween(earliestStart, today) + 1);
  const velocity = doneCount === 0 ? 0 : doneCount / activeDays;

  const highPriorityTodo = tasks.filter(
    (task) => task.priority === "high" && task.status === "todo"
  );
  const riskWindowDays = HQ_METRICS.riskWindowDays;
  const nearDeadline = highPriorityTodo.filter(
    (task) => daysBetween(today, task.due) <= riskWindowDays
  );

  const overdueHigh = tasks.filter(
    (task) =>
      task.priority === "high" &&
      task.status !== "done" &&
      daysBetween(task.due, today) > 0
  );
  const escrowRisk = overdueHigh.some((task) => task.division === "Web");
  const logisticsRisk = overdueHigh.some((task) => task.division === "Komunitas");
  const globalRisk = overdueHigh.some(
    (task) => task.division === "Branding" || task.division === "Konten"
  );

  const riskMessage = escrowRisk || logisticsRisk
    ? `CRITICAL RISK: ${
        escrowRisk && logisticsRisk
          ? "Escrow and Logistics"
          : escrowRisk
          ? "Escrow"
          : "Logistics"
      } Pillar is Weak!`
    : nearDeadline.length > 0
    ? `High Priority tasks near deadline: ${nearDeadline.length}`
    : "All clear. No critical risks detected.";

  const pillars = HQ_PILLARS.map((pillar) => {
    const relatedTasks = tasks.filter((task) => {
      const title = task.title.toLowerCase();
      const keywordMatch = pillar.keywords.some((keyword) =>
        title.includes(keyword)
      );
      const divisionMatch = pillar.divisions.includes(task.division);
      return keywordMatch || divisionMatch;
    });
    const doneTasks = relatedTasks.filter((task) => task.status === "done").length;
    const hasData = relatedTasks.length > 0;
    const isHealthy = hasData && doneTasks === relatedTasks.length;
    const inProgress = hasData && !isHealthy;
    const riskFlag =
      (pillar.id === "escrow" && escrowRisk) ||
      (pillar.id === "logistics" && logisticsRisk) ||
      (pillar.id === "global" && globalRisk);

    return {
      ...pillar,
      relatedTasks,
      doneTasks,
      hasData,
      isHealthy,
      inProgress,
      riskFlag,
    };
  });

  const PILLAR_ICON: Record<string, React.ElementType> = {
    escrow: Shield,
    logistics: Truck,
    global: Globe,
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/60">
        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-12 translate-x-10 rounded-full bg-gradient-to-br from-indigo-400/20 to-transparent blur-2xl" />
        <div className="relative">
          <div className="mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Target size={18} className="text-indigo-500" />
            <h2 className="text-base font-bold">North Star Metrics</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Market Validation
                </p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    marketCritical
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                  )}
                >
                  {marketCritical ? "Critical" : "On Track"}
                </span>
              </div>
              <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                {marketCompleted}/{marketTarget} Breeders
              </h3>
              <p className="text-xs text-slate-400">
                Erpan - Market Validation
              </p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                  style={{ width: `${marketPercent}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Progress {marketPercent}%
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Transaction Goal
                </p>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                  300 / Month
                </span>
              </div>
              <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                {HQ_METRICS.transactionCurrent}/{HQ_METRICS.transactionGoal}
              </h3>
              <p className="text-xs text-slate-400">
                Revenue Path: {HQ_METRICS.platformFeePercent}% Platform Fee
              </p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.45)]"
                  style={{ width: `${transactionPercent}%` }}
                />
              </div>
              {noRevenue ? (
                <p className="mt-2 text-[11px] text-rose-500">
                  No Revenue Detected - Accelerate Marketing!
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-slate-400">
                  Progress {transactionPercent}%
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  SOM Progress
                </p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Rp 500M
                </span>
              </div>
              <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(HQ_METRICS.somCurrent)}
              </h3>
              <p className="text-xs text-slate-400">
                Target {formatCurrency(HQ_METRICS.somTarget)}
              </p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_12px_rgba(245,158,11,0.45)]"
                  style={{ width: `${somPercent}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Progress {somPercent}%
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/60">
        <div className="absolute left-0 top-0 h-32 w-32 -translate-x-10 -translate-y-12 rounded-full bg-gradient-to-br from-amber-400/20 to-transparent blur-2xl" />
        <div className="relative">
          <div className="mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Activity size={18} className="text-amber-500" />
            <h2 className="text-base font-bold">Startup Survival Analytics</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Flame size={16} className="text-rose-500" />
                <p className="text-sm font-semibold">Burn Rate Meter</p>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Server + Marketing: {formatCurrency(monthlyBurn)} / month
              </p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 shadow-[0_0_12px_rgba(244,63,94,0.45)]"
                  style={{ width: `${Math.round(burnProgress * 100)}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                Runway: {daysLeft} hari | Est. burn sampai 15 Jan:{" "}
                {formatCurrency(burnEstimate)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <TrendingUp size={16} className="text-indigo-500" />
                <p className="text-sm font-semibold">Team Velocity</p>
              </div>
              <h3 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {velocity.toFixed(2)}
                <span className="text-sm font-semibold text-slate-400">
                  {" "}
                  tasks/day
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {doneCount} tugas selesai dalam {activeDays} hari.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <AlertTriangle size={16} className="text-amber-500" />
                <p className="text-sm font-semibold">Risk Radar</p>
              </div>
              <p
                className={cn(
                  "mt-3 text-sm font-semibold",
                  escrowRisk || logisticsRisk
                    ? "text-rose-600 dark:text-rose-300"
                    : "text-emerald-600 dark:text-emerald-300"
                )}
              >
                {riskMessage}
              </p>
              <p className="mt-2 text-[11px] text-slate-400">
                Window: {riskWindowDays} hari menuju deadline.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/60">
        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-12 translate-x-10 rounded-full bg-gradient-to-br from-emerald-400/20 to-transparent blur-2xl" />
        <div className="relative">
          <div className="mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Shield size={18} className="text-emerald-500" />
            <h2 className="text-base font-bold">Strategic Pillars Status</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {pillars.map((pillar) => {
              const Icon = PILLAR_ICON[pillar.id] || Shield;
              const statusLabel = pillar.isHealthy
                ? "Ready"
                : pillar.riskFlag
                ? "Risk"
                : pillar.inProgress
                ? "In Progress"
                : "Needs Data";
              const statusTone = pillar.isHealthy
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : pillar.riskFlag
                ? "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";

              return (
                <div
                  key={pillar.id}
                  className="rounded-xl border border-slate-200/60 bg-white/80 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <Icon size={16} className="text-indigo-500" />
                      <p className="text-sm font-semibold">{pillar.label}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        statusTone
                      )}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    {pillar.hasData ? (
                      <>
                        {pillar.doneTasks}/{pillar.relatedTasks.length} tasks done
                      </>
                    ) : (
                      "Belum ada task terkait."
                    )}
                  </div>
                  {pillar.riskFlag && (
                    <p className="mt-2 text-[11px] text-rose-500">
                      High priority overdue in this pillar.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
