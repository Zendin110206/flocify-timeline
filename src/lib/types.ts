// src/lib/types.ts

// --- BAGIAN TASK (LAMA - TETAP ADA) ---
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
  relatedFinanceId?: string;
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

// --- BAGIAN FINANCE (BARU - DITAMBAHKAN) ---

export type TransactionType = "income" | "expense" | "cash_advance";
export type TransactionStatus =
  | "pending"
  | "approved"
  | "disbursed"
  | "in_review"
  | "done"
  | "rejected";

// Kategori Keuangan (Bisa ditambah nanti)
export type FinanceCategory =
  | "Marketing"
  | "Server"
  | "Operasional"
  | "Gaji"
  | "Lainnya";

export type Transaction = {
  id: string;
  title: string;
  category: FinanceCategory;
  type: TransactionType;

  // Uang
  amount_requested: number;
  amount_realized?: number | null; // Bisa null kalau belum belanja
  amount_returned?: number | null; // Bisa null kalau gak ada kembalian

  // Status & Orang
  status: TransactionStatus;
  requester: string;
  approver?: string | null;

  // Data Pendukung
  date: string; // Format: YYYY-MM-DD
  attachments: string[]; // Array link foto
  notes?: string | null;

  created_at: string;
};
