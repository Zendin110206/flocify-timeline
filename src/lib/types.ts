// src/lib/types.ts
export type TaskStatus = "todo" | "doing" | "review" | "done" | "blocked";
export type Division = "Branding" | "Konten" | "Komunitas" | "Web" | "Keuangan";
export type Priority = "low" | "medium" | "high";

export type Subtask = {
  id: string;
  title: string;
  isCompleted: boolean;
};

export type HistoryLog = {
  id: string;
  user: string;
  action: string;
  detail: string;
  reason?: string;
  timestamp: string;
};

export type NotificationType = "info" | "success" | "warning" | "danger";

export type AppNotification = {
  id: string;
  userId: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  timestamp: string;
  relatedTaskId?: string;
};

export type Task = {
  id: string;
  title: string;
  division: Division;
  pic: string;
  members: string[];
  priority: Priority;
  start: string;
  due: string;
  status: TaskStatus;
  output: string;
  strikes: number;
  subtasks: Subtask[];
  history: HistoryLog[];
  finished_at?: string | null;
};

export type Tab =
  | "my"
  | "timeline"
  | "calendar"
  | "all"
  | "overdue"
  | "performance"
  | "requests";
