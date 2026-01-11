// src/lib/data.ts

import { Task, Division, AppNotification } from "./types";

// Anggota Tim Real
export const PEOPLE = ["Zaenal", "Rafhan", "Erpan", "Uki", "Hatta", "Inas"];

// Role & akses
export const SUPER_ADMIN = "Zaenal";
export const ADMINS = [SUPER_ADMIN, "Hatta", "Inas"];

// Divisi (Bisa dianggap Role: Branding=Hustler/Hipster, Web=Hacker, dll)
export const DIVISIONS: Division[] = [
  "Branding",
  "Konten",
  "Komunitas",
  "Web",
  "Keuangan",
];

// Notifikasi Awal: Sprint dimulai Jumat kemarin
export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n1",
    userId: "All",
    message: "🚀 SPRINT 1 DIMULAI (9 - 16 Jan). Fokus: Validasi & MVP.",
    type: "info",
    isRead: false,
    timestamp: "2026-01-09T08:00:00",
  },
  {
    id: "n2",
    userId: "Zaenal",
    message: "Sistem Flocify ready. Database aman. Silakan input progress.",
    type: "success",
    isRead: false,
    timestamp: "2026-01-10T20:00:00",
  },
];

export const INITIAL_TASKS: Task[] = [
  // ==============================================
  // 💼 TEAM HUSTLER (Inas & Rafhan)
  // Fokus: Bisnis, Uang, Branding, Pitching
  // ==============================================

  // 1. Rafhan - Branding & Pitch Deck
  {
    id: "t_rafhan_1",
    title: "Finalisasi Identitas Visual & Deck",
    division: "Branding",
    pic: "Rafhan",
    members: ["Inas"],
    priority: "high",
    start: "2026-01-09", // Mulai Jumat
    due: "2026-01-13", // Deadline Selasa (Masih Aman)
    status: "doing",
    output: "Folder GDrive isi Logo Final + Pitch Deck PDF",
    strikes: 0,
    subtasks: [
      { id: "s1", title: "Finalisasi Logo (Vektor/PNG)", isCompleted: true },
      { id: "s2", title: "Susun Struktur Pitch Deck", isCompleted: true },
      { id: "s3", title: "Desain Slide Presentasi", isCompleted: false },
      { id: "s4", title: "Mockup Produk untuk Slide", isCompleted: false },
    ],
    history: [
      {
        id: "h1",
        user: "Rafhan",
        action: "Created",
        detail: "Sprint started",
        timestamp: "2026-01-09T09:00:00",
      },
    ],
  },

  // 2. Inas - Keuangan
  {
    id: "t_inas_1",
    title: "Setup Cashflow & RAB Awal",
    division: "Keuangan",
    pic: "Inas",
    members: [],
    priority: "medium",
    start: "2026-01-10",
    due: "2026-01-14", // Deadline Rabu (Masih Aman)
    status: "todo",
    output: "File Excel Cashflow + List kebutuhan pembelian",
    strikes: 0,
    subtasks: [
      { id: "s1", title: "Buat Format Laporan Keuangan", isCompleted: false },
      { id: "s2", title: "List harga server & domain", isCompleted: false },
      { id: "s3", title: "Catat modal awal masuk", isCompleted: false },
    ],
    history: [],
  },

  // ==============================================
  // 💻 TEAM HACKER (Zaenal & Hatta)
  // Fokus: Coding, Website, Database
  // ==============================================

  // 3. Zaenal - Lead Dev (DONE)
  {
    id: "t_zaenal_1",
    title: "Build MVP Website Flocify",
    division: "Web",
    pic: "Zaenal",
    members: ["Hatta"],
    priority: "high",
    start: "2026-01-09",
    due: "2026-01-11", // Deadline hari ini (tapi udah kelar)
    status: "done", // SUDAH SELESAI
    output: "Website bisa diakses localhost/deploy",
    strikes: 0,
    subtasks: [
      { id: "s1", title: "Setup Next.js Project", isCompleted: true },
      { id: "s2", title: "Connect Supabase Database", isCompleted: true },
      { id: "s3", title: "Fitur Auto-Strike & Notif", isCompleted: true },
    ],
    history: [
      {
        id: "h1",
        user: "Zaenal",
        action: "Completed",
        detail: "Deployment sukses",
        timestamp: "2026-01-11T01:00:00",
      },
    ],
  },

  // 4. Hatta - Frontend Features
  {
    id: "t_hatta_1",
    title: "Halaman Login & Integrasi UI",
    division: "Web",
    pic: "Hatta",
    members: ["Zaenal"],
    priority: "high",
    start: "2026-01-09",
    due: "2026-01-13", // Deadline Selasa (Masih Aman)
    status: "doing",
    output: "Login page jalan + Dashboard rapi sesuai desain",
    strikes: 0,
    subtasks: [
      { id: "s1", title: "Slicing Component Navbar", isCompleted: true },
      { id: "s2", title: "Logic Login (Auth)", isCompleted: false },
      { id: "s3", title: "Styling Dark Mode", isCompleted: false },
    ],
    history: [
      {
        id: "h1",
        user: "Hatta",
        action: "Created",
        detail: "Mulai coding UI",
        timestamp: "2026-01-09T13:00:00",
      },
    ],
  },

  // ==============================================
  // 🎨 TEAM HIPSTER (Erpan & Uki)
  // Fokus: Komunitas, Desain, Konten, "Sisanya"
  // ==============================================

  // 5. Erpan - Komunitas / Door to Door
  {
    id: "t_erpan_1",
    title: "Door to Door: Visit 2 Prospek",
    division: "Komunitas",
    pic: "Erpan",
    members: ["Uki"],
    priority: "high",
    start: "2026-01-10",
    due: "2026-01-12", // Deadline Senin (Besok)
    status: "todo", // Belum jalan, rencana besok
    output: "Foto dokumentasi visit + Hasil interview 2 orang",
    strikes: 0,
    subtasks: [
      { id: "s1", title: "Tentukan 2 orang target", isCompleted: false },
      { id: "s2", title: "Siapkan pertanyaan interview", isCompleted: true },
      { id: "s3", title: "Visit & Dokumentasi", isCompleted: false },
    ],
    history: [],
  },

  // 6. Uki - Konten Kreator
  {
    id: "t_uki_1",
    title: "Konten Sosmed (Perkenalan)",
    division: "Konten",
    pic: "Uki",
    members: ["Erpan"],
    priority: "medium",
    start: "2026-01-10",
    due: "2026-01-14", // Deadline Rabu
    status: "doing",
    output: "1 Video Reels/TikTok (Teaser) siap upload",
    strikes: 0,
    subtasks: [
      { id: "s1", title: "Cari referensi trend", isCompleted: true },
      { id: "s2", title: "Take video tim working", isCompleted: false },
      { id: "s3", title: "Editing CapCut", isCompleted: false },
    ],
    history: [],
  },
];


