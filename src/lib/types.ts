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

export type Announcement = {
  id: string;
  title: string;
  message: string;
  tone: NotificationType;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at: string;
  created_by: string;
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
  initiativeId?: string | null;
  okrId?: string | null;
  milestoneId?: string | null;
};

export type Tab =
  | "my"
  | "timeline"
  | "calendar"
  | "all"
  | "overdue"
  | "performance"
  | "requests";

// --- BAGIAN STRATEGY (PROJECT / OKR / MILESTONE) ---
export type InitiativeStatus = "on_track" | "at_risk" | "off_track";

export type Initiative = {
  id: string;
  title: string;
  owner: string;
  start: string;
  due: string;
  status: InitiativeStatus;
  summary?: string;
};

export type OKR = {
  id: string;
  initiativeId: string;
  title: string;
  owner: string;
  target: string;
};

export type MilestoneStatus = "planned" | "in_progress" | "done";

export type Milestone = {
  id: string;
  initiativeId: string;
  title: string;
  due: string;
  status: MilestoneStatus;
};

export type TaskMeta = {
  initiativeId?: string | null;
  okrId?: string | null;
  milestoneId?: string | null;
};

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
