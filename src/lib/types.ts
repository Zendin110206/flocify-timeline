// src/lib/types.ts
export type TaskStatus = "todo" | "doing" | "review" | "done" | "blocked";
export type Division = "Branding" | "Konten" | "Komunitas" | "Web" | "Keuangan";
export type Priority = "low" | "medium" | "high";

export type Subtask = {
  id: string;
  title: string;
  isCompleted: boolean;
};

// Log untuk mencatat siapa yang mengubah apa
export type HistoryLog = {
  id: string;
  user: string;
  action: string;
  detail: string;
  reason?: string;
  timestamp: string;
};

// --- TIPE DATA BARU: NOTIFIKASI ---
export type NotificationType = "info" | "success" | "warning" | "danger";

export type AppNotification = {
  id: string;
  userId: string; // Notif ini untuk siapa? (e.g. "Raf")
  message: string; // Pesan: "Tugas Logo Telat!"
  type: NotificationType; // Warna notif (Merah/Kuning/Biru)
  isRead: boolean; // Sudah dibaca belum?
  timestamp: string;
  relatedTaskId?: string; // Link ke tugas terkait (opsional)
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
  strikes: number; // Jumlah pelanggaran di tugas ini
  subtasks: Subtask[];
  history: HistoryLog[];
};

// Tambahkan "hq" di deretan ini
export type Tab =
  | "my"
  | "timeline"
  | "calendar"
  | "all"
  | "overdue"
  | "performance"
  | "requests"
  | "hq";
