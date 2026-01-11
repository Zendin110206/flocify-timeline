// src/components/features/TaskList.tsx
import React from "react";
import { Task, TaskStatus } from "@/lib/types";
import { TaskCard } from "./TaskCard"; // Kita panggil komponen kartu
import { CheckCircle2 } from "lucide-react";
import { SUPER_ADMIN } from "@/lib/data";

interface TaskListProps {
  tasks: Task[];
  today: string;
  onUpdateStatus: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  emptyMessage?: string;
  currentUser?: string;
}

export function TaskList({
  tasks,
  today,
  onUpdateStatus,
  onEdit,
  onDelete,
  emptyMessage = "Tidak ada tugas.",
  currentUser = SUPER_ADMIN,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center dark:border-slate-700 dark:bg-slate-800/50">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
          <CheckCircle2 className="h-6 w-6 text-slate-400 dark:text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          today={today}
          currentUser={currentUser}
          onUpdateStatus={onUpdateStatus}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}


