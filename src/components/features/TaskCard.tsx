// src/components/features/TaskCard.tsx
import React from "react";
import {
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  XCircle,
  MoreHorizontal,
  ArrowUpRight,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { Task, TaskStatus } from "@/lib/types";
import { useDialog } from "@/components/ui/DialogProvider";
import { usePermission } from "@/hooks/usePermission";

interface TaskCardProps {
  task: Task;
  today: string;
  currentUser: string;
  onUpdateStatus: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export function TaskCard({
  task,
  today,
  currentUser,
  onUpdateStatus,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const dialog = useDialog();

  // Panggil Hakim
  const { canUpdateStatus, canEditTask, canDeleteTask, canMarkDone } =
    usePermission(currentUser);

  const isOverdue = task.status !== "done" && task.due < today;
  const totalSub = task.subtasks?.length || 0;
  const doneSub = task.subtasks?.filter((s) => s.isCompleted).length || 0;

  // --- PERBAIKAN DISINI: Variabel ini sekarang dipakai di bawah ---
  const progressPercent =
    totalSub === 0 ? 0 : Math.round((doneSub / totalSub) * 100);

  // Izin Spesifik
  const allowUpdate = canUpdateStatus(task);
  const allowEdit = canEditTask(task);
  const allowDelete = canDeleteTask();
  const allowMarkDone = canMarkDone();

  const getStatusStyle = (status: TaskStatus) => {
    switch (status) {
      case "done":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-500/10",
          textColor: "text-emerald-600 dark:text-emerald-400",
          borderColor: "border-emerald-200 dark:border-emerald-500/20",
          icon: CheckCircle2,
        };
      case "doing":
        return {
          bg: "bg-blue-50 dark:bg-blue-500/10",
          textColor: "text-blue-600 dark:text-blue-400",
          borderColor: "border-blue-200 dark:border-blue-500/20",
          icon: Clock,
        };
      case "review":
        return {
          bg: "bg-purple-50 dark:bg-purple-500/10",
          textColor: "text-purple-600 dark:text-purple-400",
          borderColor: "border-purple-200 dark:border-purple-500/20",
          icon: HelpCircle,
        };
      case "blocked":
        return {
          bg: "bg-rose-50 dark:bg-rose-500/10",
          textColor: "text-rose-600 dark:text-rose-400",
          borderColor: "border-rose-200 dark:border-rose-500/20",
          icon: XCircle,
        };
      default:
        return {
          bg: "bg-slate-50 dark:bg-slate-800",
          textColor: "text-slate-600 dark:text-slate-400",
          borderColor: "border-slate-200 dark:border-slate-700",
          icon: Clock,
        };
    }
  };

  const statusStyle = getStatusStyle(task.status);
  const StatusIcon = statusStyle.icon;
  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  const handleStatusChange = (nextStatus: TaskStatus) => {
    if (nextStatus === "done" && !allowMarkDone) {
      void dialog.alert({
        title: "Akses Ditolak",
        message:
          "Hanya Admin yang boleh memvalidasi tugas menjadi Done. Silakan ubah ke 'Review'.",
        tone: "danger",
      });
      return;
    }
    onUpdateStatus(task.id, nextStatus);
  };

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:bg-slate-900 ${
        isOverdue
          ? "border-rose-200 ring-1 ring-rose-100 dark:border-rose-900/50 dark:ring-rose-900/20"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      {task.status === "done" && !allowUpdate && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-slate-50/50 backdrop-blur-[1px] dark:bg-slate-900/50">
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-600 shadow-sm dark:bg-slate-800">
            <Lock size={12} /> Terkunci
          </div>
        </div>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {task.division}
          </span>
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1 text-[10px] ${
                isOverdue ? "font-bold text-rose-500" : "text-slate-400"
              }`}
            >
              <Calendar size={12} />
              {new Date(task.due).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
              })}
            </div>
            {task.priority === "high" && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500">
                <AlertCircle size={10} />
              </span>
            )}
          </div>
        </div>

        <h3 className="mb-4 text-base font-bold leading-snug text-slate-800 dark:text-slate-100 line-clamp-2">
          <Link
            href={`/task/${task.id}`}
            className="block transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
            title="Lihat detail tugas"
          >
            {task.title}
          </Link>
        </h3>

        <div className="mb-5 flex items-center justify-between border-b border-slate-50 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white ring-2 ring-white dark:ring-slate-900"
              title={`PIC: ${task.pic}`}
            >
              {getInitials(task.pic)}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                PIC
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {task.pic}
              </span>
            </div>
          </div>

          {task.members && task.members.length > 0 && (
            <div className="flex items-center -space-x-2">
              {task.members.slice(0, 3).map((member, idx) => (
                <div
                  key={idx}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-600 ring-2 ring-white dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-900"
                  title={`Member: ${member}`}
                >
                  {getInitials(member)}
                </div>
              ))}
              {task.members.length > 3 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-400 ring-2 ring-white dark:bg-slate-800 dark:ring-slate-900">
                  <MoreHorizontal size={12} />
                </div>
              )}
            </div>
          )}
        </div>

        {totalSub > 0 && (
          <div className="mb-4">
            <div className="mb-1 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Progress</span>
              <span className="font-bold text-slate-600 dark:text-slate-300">
                {/* PERBAIKAN: Pakai variabel progressPercent disini */}
                {progressPercent}% ({doneSub}/{totalSub})
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full transition-all duration-500 ${
                  progressPercent === 100 ? "bg-emerald-500" : "bg-indigo-500"
                }`}
                // PERBAIKAN: Pakai variabel progressPercent disini juga
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="relative flex-1">
          <div
            className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${statusStyle.textColor}`}
          >
            <StatusIcon size={14} />
          </div>
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
            disabled={!allowUpdate}
            className={`h-9 w-full appearance-none rounded-xl border pl-8 pr-8 text-xs font-bold uppercase tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer
              ${statusStyle.bg} ${statusStyle.borderColor} ${statusStyle.textColor}`}
          >
            <option value="todo">To Do</option>
            <option value="doing">Doing</option>
            <option value="blocked">Blocked</option>
            <option value="review">Review</option>
            <option
              value="done"
              disabled={!allowMarkDone && task.status !== "done"}
            >
              Done{" "}
              {!allowMarkDone && task.status !== "done" ? "(Admin Only)" : ""}
            </option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          <Link
            href={`/task/${task.id}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 transition-colors dark:border-slate-800 dark:hover:bg-indigo-900/20"
            title="Lihat detail"
          >
            <ArrowUpRight size={16} />
          </Link>
          {allowEdit && (
            <button
              onClick={() => onEdit(task)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 transition-colors dark:border-slate-800 dark:hover:bg-indigo-900/20"
            >
              <Edit2 size={16} />
            </button>
          )}
          {allowDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors dark:border-slate-800 dark:hover:bg-rose-900/20"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {task.strikes > 0 && (
        <div className="absolute -right-2 -top-2 flex h-6 w-6 animate-bounce items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white shadow-md ring-2 ring-white dark:ring-slate-900">
          {task.strikes}
        </div>
      )}
    </div>
  );
}
