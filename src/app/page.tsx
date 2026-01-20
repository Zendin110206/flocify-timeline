// src/app/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Task, Tab, Division, TaskStatus } from "@/lib/types";
import { todayISO, daysBetween, STATUS_CONFIG } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  INITIAL_TASKS,
  INITIAL_NOTIFICATIONS,
  ADMINS,
  REVIEW_APPROVERS,
  SUPER_ADMIN,
} from "@/lib/data";
import { upsertTaskMeta } from "@/lib/taskMeta";

// Hooks Baru
import { useTaskData } from "@/hooks/useTaskData";
import { useAnnouncements } from "@/hooks/useAnnouncements";

// Components
import { Navbar } from "@/components/layout/Navbar";
import { LoginPage } from "@/components/layout/LoginPage";
import { TabNavigation } from "@/components/layout/TabNavigation";
import { Modal } from "@/components/ui/Modal";
import { TaskList } from "@/components/features/TaskList";
import { TaskFilters } from "@/components/features/TaskFilters";
import { TimelineView } from "@/components/features/TimelineView";
import { GanttView } from "@/components/features/GanttView";
import { PerformanceTable } from "@/components/features/PerformanceTable";
import { RequestInbox, RequestItem } from "@/components/features/RequestInbox";
import { TaskForm } from "@/components/features/TaskForm";
import { AnnouncementsPanel } from "@/components/features/AnnouncementsPanel";
import { useDialog } from "@/components/ui/DialogProvider";

// Helpers Sederhana
const generateId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const getTimestamp = () => new Date().toISOString();
const getQuotedText = (message: string) => {
  const match = message.match(/"([^"]+)"/);
  return match ? match[1] : null;
};
const parseRequestDetail = (detail: string) => {
  const matches = detail.match(/\d{4}-\d{2}-\d{2}/g);
  if (!matches || matches.length === 0) return null;
  const from = matches[0];
  const to = matches[1] ?? matches[0];
  if (!from || !to) return null;
  return { from, to };
};
const TASK_TAG_REGEX = /\s*\[task:([^\]]+)\]/;
const FINANCE_TAG_REGEX = /\s*\[finance:([^\]]+)\]/;
const ANNOUNCE_TAG_REGEX = /\s*\[announce\]/;
const extractTaskTag = (message: string) => {
  const match = message.match(TASK_TAG_REGEX);
  return match ? match[1] : null;
};
const extractFinanceTag = (message: string) => {
  const match = message.match(FINANCE_TAG_REGEX);
  return match ? match[1] : null;
};
const stripNotificationTags = (message: string) =>
  message
    .replace(TASK_TAG_REGEX, "")
    .replace(FINANCE_TAG_REGEX, "")
    .replace(ANNOUNCE_TAG_REGEX, "")
    .trim();
const buildTaskTag = (taskId: string) => `[task:${taskId}]`;

type TaskPayload = {
  id: string;
  title: string;
  division: Task["division"];
  pic: string;
  members: Task["members"];
  priority: Task["priority"];
  start_date: string;
  due_date: string;
  status: Task["status"];
  output: string;
  strikes: number;
  subtasks: Task["subtasks"];
  history: Task["history"];
  finished_at: Task["finished_at"];
};

export default function FlocifyDashboard() {
  const dialog = useDialog();

  // --- PANGGIL HOOK BARU DISINI ---
  // Semua data tasks & notif sekarang diurus otomatis oleh hook ini
  const {
    tasks,
    setTasks,
    notifications,
    setNotifications,
    isLoading,
    refreshData,
  } = useTaskData();
  const {
    announcements,
    isLoading: isAnnouncementsLoading,
    refreshAnnouncements,
  } = useAnnouncements();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [me, setMe] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("my");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDivision, setFilterDivision] = useState<Division | "all">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const today = todayISO();
  const isSuperAdmin = me === SUPER_ADMIN;
  const isAdmin = ADMINS.includes(me);
  const effectiveTab =
    !isSuperAdmin && activeTab === "requests" ? "my" : activeTab;

  // --- LOGIKA AUTH SEDERHANA ---
  useEffect(() => {
    const savedUser = localStorage.getItem("flocify-user");
    if (savedUser) {
      // Tambahkan setTimeout agar tidak dianggap synchronous
      setTimeout(() => {
        setMe(savedUser);
        setIsLoggedIn(true);
      }, 0);
    }
  }, []);

  // --- LOGIKA REQUEST INBOX ---
  const pendingRequests = useMemo<RequestItem[]>(() => {
    const items: RequestItem[] = [];
    tasks.forEach((task) => {
      if (!task.history || task.history.length === 0) return;
      const sorted = [...task.history].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      const latestRequest = sorted.find(
        (log) => log.action === "Deadline Request",
      );
      if (!latestRequest) return;
      const requestTime = new Date(latestRequest.timestamp).getTime();
      const decision = sorted.find(
        (log) =>
          (log.action === "Deadline Approved" ||
            log.action === "Deadline Rejected") &&
          new Date(log.timestamp).getTime() > requestTime,
      );
      if (decision) return;

      const parsed = parseRequestDetail(latestRequest.detail);
      items.push({
        taskId: task.id,
        title: task.title,
        division: task.division,
        pic: task.pic,
        requestedBy: latestRequest.user,
        requestedAt: latestRequest.timestamp,
        detail: latestRequest.detail,
        from: parsed?.from,
        to: parsed?.to,
        reason: latestRequest.reason,
      });
    });
    return items.sort(
      (a, b) =>
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
    );
  }, [tasks]);

  // --- LOGIKA LINK NOTIFIKASI ---
  const linkedNotifications = useMemo(() => {
    return notifications.map((notif) => {
      const cleanMessage = stripNotificationTags(notif.message);
      const financeTaggedId = extractFinanceTag(notif.message);
      if (financeTaggedId) {
        return {
          ...notif,
          relatedFinanceId: financeTaggedId,
          message: cleanMessage,
        };
      }
      const taskTaggedId = extractTaskTag(notif.message);
      if (taskTaggedId) {
        return {
          ...notif,
          relatedTaskId: taskTaggedId,
          message: cleanMessage,
        };
      }
      const title = getQuotedText(cleanMessage);
      if (!title || tasks.length === 0) return { ...notif, message: cleanMessage };
      const matchedTask = tasks.find((task) => task.title === title);
      return matchedTask
        ? { ...notif, relatedTaskId: matchedTask.id, message: cleanMessage }
        : { ...notif, message: cleanMessage };
    });
  }, [notifications, tasks]);

  const handleTabChange = (tab: Tab) => {
    if (tab === "requests" && !isSuperAdmin) return;
    setActiveTab(tab);
  };

  // --- FITUR: TUTUP BUKU MINGGUAN ---
  const handleCloseSprint = async () => {
    const doneTasks = tasks.filter((t) => t.status === "done");
    if (doneTasks.length === 0) {
      await dialog.alert({
        title: "Tidak Bisa Tutup Buku",
        message: "Belum ada tugas yang selesai (Done).",
        tone: "danger",
      });
      return;
    }

    const sprintName = await dialog.prompt({
      title: "Tutup Buku",
      message: "Masukkan nama periode / sprint.",
      inputLabel: "Nama Sprint",
      defaultValue: `Minggu ${new Date().getDate()} Jan 2026`,
      confirmText: "Lanjut",
    });
    if (!sprintName) return;

    const confirmed = await dialog.confirm({
      title: "Konfirmasi Tutup Buku",
      message: `Yakin ingin menutup buku?\n\n${doneTasks.length} tugas 'Done' akan dipindahkan ke Arsip.\nTugas yang belum selesai akan tetap di sini.`,
      confirmText: "Tutup Buku",
      cancelText: "Batal",
      tone: "danger",
    });
    if (!confirmed) return;

    // 1. Simpan ke Arsip
    const { error: archiveError } = await supabase.from("archives").insert({
      id: generateId("arc"),
      title: sprintName,
      closed_by: me,
      total_done: doneTasks.length,
      tasks_data: doneTasks,
    });

    if (archiveError) {
      await dialog.alert({
        title: "Gagal Mengarsipkan",
        message: archiveError.message,
        tone: "danger",
      });
      return;
    }

    // 2. Hapus dari Dashboard (Tasks)
    const doneIds = doneTasks.map((t) => t.id);
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .in("id", doneIds);
    if (deleteError) {
      await dialog.alert({
        title: "Gagal Menghapus Tugas",
        message: deleteError.message,
        tone: "danger",
      });
      return;
    }

    // 3. Notifikasi Sukses
    await supabase.from("notifications").insert({
      id: generateId("n-close"),
      user_id: "All",
      message: `🏁 SPRINT CLOSED: "${sprintName}" telah diarsipkan oleh ${me}.`,
      type: "success",
      timestamp: getTimestamp(),
    });

    await dialog.alert({
      title: "Tutup Buku Berhasil",
      message: "Cek menu Laporan untuk melihat arsip.",
    });
    // Tidak perlu reload, realtime akan update otomatis
  };

  // --- SEEDING (RESET) ---
  const handleSimulateNewDay = async () => {
    const confirmed = await dialog.confirm({
      title: "Reset Data",
      message: "Reset total ke data dummy awal?",
      confirmText: "Reset",
      cancelText: "Batal",
      tone: "danger",
    });
    if (!confirmed) return;

    await supabase.from("tasks").delete().neq("id", "0");
    await supabase.from("notifications").delete().neq("id", "0");
    await supabase.from("archives").delete().neq("id", "0");

    const seedTasks = INITIAL_TASKS.map((t) => ({
      id: t.id,
      title: t.title,
      division: t.division,
      pic: t.pic,
      members: t.members,
      priority: t.priority,
      start_date: t.start,
      due_date: t.due,
      status: t.status,
      output: t.output,
      strikes: t.strikes,
      subtasks: t.subtasks,
      history: upsertTaskMeta(
        t.history || [],
        {
          initiativeId: t.initiativeId ?? null,
          okrId: t.okrId ?? null,
          milestoneId: t.milestoneId ?? null,
        },
        t.pic,
        getTimestamp(),
      ),
    }));
    const seedNotifs = INITIAL_NOTIFICATIONS.map((n) => ({
      id: n.id,
      user_id: n.userId,
      message: n.message,
      type: n.type,
      is_read: n.isRead,
      timestamp: n.timestamp,
    }));

    await supabase.from("tasks").insert(seedTasks);
    await supabase.from("notifications").insert(seedNotifs);

    await dialog.alert({
      title: "Reset Berhasil",
      message: "Data dummy sudah dimuat ulang.",
    });
    // Tidak perlu reload
  };

  // --- CRUD HANDLERS ---
  const handleUpdateStatus = async (id: string, status: TaskStatus) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;

    const timestamp = getTimestamp();

    // LOGIKA BARU: Cek Finished At
    // Kalau status baru adalah 'done', isi finished_at dengan jam sekarang.
    // Kalau status baru BUKAN 'done' (misal dibalikin ke review), kosongkan finished_at.
    const finishedAt = status === "done" ? timestamp : null;

    const nextHistory = [
      {
        id: generateId("h-status"),
        user: me || "SYSTEM",
        action: "Status Update",
        detail: `${STATUS_CONFIG[task.status].label} -> ${
          STATUS_CONFIG[status].label
        }`,
        timestamp,
      },
      ...(task.history || []),
    ];

    // Optimistic Update (Update tampilan dulu biar cepat)
    const updatedTask: Task = {
      ...task,
      status,
      history: nextHistory,
      finished_at: finishedAt, // Update di state lokal juga
    };
    setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)));

    // Update ke Database
    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        status,
        history: nextHistory,
        finished_at: finishedAt, // Kirim ke database
      })
      .eq("id", id);

    if (updateError) {
      await dialog.alert({
        title: "Gagal Update Status",
        message: updateError.message,
        tone: "danger",
      });
      refreshData(); // Revert kalau gagal
      return;
    }

    if (status === "review") {
      const recipients = REVIEW_APPROVERS.filter((user) => user !== me);
      if (recipients.length > 0) {
        await supabase.from("notifications").insert(
          recipients.map((userId) => ({
            id: generateId("n-rev"),
            user_id: userId,
            message: `🔍 REVIEW: ${me} -> "${task.title}". ${buildTaskTag(
              task.id,
            )}`,
            type: "warning",
            is_read: false,
            timestamp,
          })),
        );
      }
    }
  };

  const handleSaveTask = async (task: Task) => {
    // LOGIKA BARU: Tentukan finished_at saat Simpan/Edit
    // Kalau statusnya 'done', kita butuh timestamp.
    // Kalau task sudah ada (edit) dan statusnya gak berubah, pertahankan finished_at lama.
    // Kalau task baru atau status berubah jadi done, pakai jam sekarang.

    let finishedAt = task.finished_at; // Default: pakai data lama

    if (task.status === "done") {
      // Kalau data lama belum ada finished_at, atau ini tugas baru, set jam sekarang
      if (!finishedAt) {
        finishedAt = getTimestamp();
      }
    } else {
      // Kalau status bukan done (misal dibalikin ke doing), hapus finished_at
      finishedAt = null;
    }

    const dbPayload: TaskPayload = {
      id: task.id,
      title: task.title,
      division: task.division,
      pic: task.pic,
      members: task.members,
      priority: task.priority,
      start_date: task.start,
      due_date: task.due,
      status: task.status,
      output: task.output,
      strikes: task.strikes,
      subtasks: task.subtasks,
      history: task.history,
      finished_at: finishedAt, // <--- PENTING: Kirim ini ke database!
    };

    if (editingTask) {
      const { error: updateError } = await supabase
        .from("tasks")
        .update(dbPayload)
        .eq("id", task.id);
      if (updateError) {
        await dialog.alert({
          title: "Gagal Menyimpan",
          message: updateError.message,
          tone: "danger",
        });
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("tasks")
        .insert(dbPayload);
      if (insertError) {
        await dialog.alert({
          title: "Gagal Menyimpan",
          message: insertError.message,
          tone: "danger",
        });
        return;
      }
      await supabase.from("notifications").insert({
        id: generateId("n-new"),
        user_id: task.pic,
        message: `✨ TUGAS BARU: "${task.title}". ${buildTaskTag(task.id)}`,
        type: "info",
        timestamp: getTimestamp(),
      });
    }
    handleCloseModal();
    // Tidak perlu fetchFromDatabase(), realtime akan handle
  };

  const handleDeleteTask = async (id: string) => {
    const confirmed = await dialog.confirm({
      title: "Hapus Tugas",
      message: "Hapus tugas ini? Tindakan ini tidak bisa dibatalkan.",
      confirmText: "Hapus",
      cancelText: "Batal",
      tone: "danger",
    });
    if (!confirmed) return;

    // Optimistic delete
    setTasks((prev) => prev.filter((t) => t.id !== id));

    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (deleteError) {
      await dialog.alert({
        title: "Gagal Menghapus",
        message: deleteError.message,
        tone: "danger",
      });
      refreshData();
    }
  };

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const handleClearNotifs = async () => {
    setNotifications((prev) => prev.filter((n) => n.userId !== me));
    await supabase.from("notifications").delete().eq("user_id", me);
  };

  const handleLogin = (u: string) => {
    setMe(u);
    setIsLoggedIn(true);
    localStorage.setItem("flocify-user", u);
  };
  const handleLogout = () => {
    setMe("");
    setIsLoggedIn(false);
    localStorage.removeItem("flocify-user");
  };
  const handleEditClick = (t: Task) => {
    setEditingTask(t);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const filteredTasks = tasks.filter((t) => {
    const s = searchQuery.toLowerCase();
    return (
      (t.title.toLowerCase().includes(s) || t.pic.toLowerCase().includes(s)) &&
      (filterDivision === "all" || t.division === filterDivision)
    );
  });
  const myTasks = filteredTasks.filter(
    (t) => t.pic === me || (t.members && t.members.includes(me)),
  );
  const overdueTasks = filteredTasks.filter(
    (t) => t.status !== "done" && daysBetween(t.due, today) > 0,
  );

  if (isLoading)
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500 dark:border-slate-800 dark:border-t-indigo-400"></div>
          <span className="text-sm font-medium">Connecting to HQ...</span>
        </div>
      </div>
    );

  if (!isLoggedIn) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <Navbar
        currentUser={me}
        notifications={linkedNotifications}
        onMarkRead={handleMarkRead}
        onClearNotifs={handleClearNotifs}
        onLogout={handleLogout}
        onAddTask={() => setIsModalOpen(true)}
        onSimulateNewDay={handleSimulateNewDay}
        onCloseSprint={handleCloseSprint}
      />
      <TabNavigation
        activeTab={effectiveTab}
        onChange={handleTabChange}
        overdueCount={overdueTasks.length}
        requestCount={pendingRequests.length}
        showRequests={isSuperAdmin}
      />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6">
          <AnnouncementsPanel
            announcements={announcements}
            isLoading={isAnnouncementsLoading}
            currentUser={me}
            isAdmin={isAdmin}
            onRefresh={refreshAnnouncements}
          />
        </div>
        {["my", "all", "timeline", "calendar", "overdue"].includes(
          effectiveTab,
        ) && (
          <div className="mb-6">
            <TaskFilters
              search={searchQuery}
              onSearchChange={setSearchQuery}
              division={filterDivision}
              onDivisionChange={setFilterDivision}
            />
          </div>
        )}
        {effectiveTab === "my" && (
          <TaskList
            tasks={myTasks}
            today={today}
            onUpdateStatus={handleUpdateStatus}
            onEdit={handleEditClick}
            onDelete={handleDeleteTask}
            currentUser={me}
            emptyMessage={`Tidak ada tugas untuk ${me}.`}
          />
        )}
        {effectiveTab === "timeline" && (
          <TimelineView tasks={filteredTasks} today={today} />
        )}
        {effectiveTab === "calendar" && (
          <GanttView tasks={filteredTasks} today={today} />
        )}
        {effectiveTab === "all" && (
          <TaskList
            tasks={filteredTasks}
            today={today}
            onUpdateStatus={handleUpdateStatus}
            onEdit={handleEditClick}
            onDelete={handleDeleteTask}
            currentUser={me}
          />
        )}
        {effectiveTab === "overdue" && (
          <TaskList
            tasks={overdueTasks}
            today={today}
            onUpdateStatus={handleUpdateStatus}
            onEdit={handleEditClick}
            onDelete={handleDeleteTask}
            currentUser={me}
            emptyMessage="Aman! Tidak ada tugas yang telat."
          />
        )}
        {effectiveTab === "performance" && <PerformanceTable tasks={tasks} />}
        {effectiveTab === "requests" && isSuperAdmin && (
          <RequestInbox items={pendingRequests} />
        )}
      </main>
      {isModalOpen && (
        <Modal
          title={editingTask ? "Edit Tugas" : "Buat Tugas Baru"}
          onClose={handleCloseModal}
        >
          <TaskForm
            initialData={editingTask}
            onSave={handleSaveTask}
            onCancel={handleCloseModal}
            defaultOwner={me}
            tasks={tasks}
          />
        </Modal>
      )}
    </div>
  );
}
