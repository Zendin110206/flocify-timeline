// src/app/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Task, Tab, Division, TaskStatus, AppNotification } from "@/lib/types";
import { todayISO, daysBetween, STATUS_CONFIG } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  FEATURE_FLAGS,
  INITIAL_TASKS,
  INITIAL_NOTIFICATIONS,
  SUPER_ADMIN,
} from "@/lib/data";

import { Navbar } from "@/components/layout/Navbar";
import { LoginPage } from "@/components/layout/LoginPage";
import { TabNavigation } from "@/components/layout/TabNavigation";
import { Modal } from "@/components/ui/Modal";
import { TaskList } from "@/components/features/TaskList";
import { TaskFilters } from "@/components/features/TaskFilters";
import { TimelineView } from "@/components/features/TimelineView";
import { GanttView } from "@/components/features/GanttView";
import { PerformanceTable } from "@/components/features/PerformanceTable";
import { StrategicDashboard } from "@/components/features/StrategicDashboard";
import { RequestInbox, RequestItem } from "@/components/features/RequestInbox";
import { TaskForm } from "@/components/features/TaskForm";
import { useDialog } from "@/components/ui/DialogProvider";

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
const extractTaskTag = (message: string) => {
  const match = message.match(TASK_TAG_REGEX);
  return match ? match[1] : null;
};
const stripTaskTag = (message: string) =>
  message.replace(TASK_TAG_REGEX, "").trim();
const buildTaskTag = (taskId: string) => `[task:${taskId}]`;
const isSameLocalDay = (timestamp: string, dayISO: string) => {
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}` === dayISO;
};

export default function FlocifyDashboard() {
  const dialog = useDialog();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [me, setMe] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [activeTab, setActiveTab] = useState<Tab>("my");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDivision, setFilterDivision] = useState<Division | "all">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const today = todayISO();
  const isSuperAdmin = me === SUPER_ADMIN;
  const effectiveTab =
    activeTab === "hq" && !FEATURE_FLAGS.hq
      ? "my"
      : !isSuperAdmin && activeTab === "requests"
      ? "my"
      : activeTab;

  const pendingRequests = useMemo<RequestItem[]>(() => {
    const items: RequestItem[] = [];
    tasks.forEach((task) => {
      if (!task.history || task.history.length === 0) return;
      const sorted = [...task.history].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const latestRequest = sorted.find(
        (log) => log.action === "Deadline Request"
      );
      if (!latestRequest) return;
      const requestTime = new Date(latestRequest.timestamp).getTime();
      const decision = sorted.find(
        (log) =>
          (log.action === "Deadline Approved" ||
            log.action === "Deadline Rejected") &&
          new Date(log.timestamp).getTime() > requestTime
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
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
  }, [tasks]);

  const linkedNotifications = useMemo(() => {
    return notifications.map((notif) => {
      const taggedId = extractTaskTag(notif.message);
      if (taggedId) {
        return {
          ...notif,
          relatedTaskId: taggedId,
          message: stripTaskTag(notif.message),
        };
      }
      const title = getQuotedText(notif.message);
      if (!title || tasks.length === 0) return notif;
      const matchedTask = tasks.find((task) => task.title === title);
      return matchedTask ? { ...notif, relatedTaskId: matchedTask.id } : notif;
    });
  }, [notifications, tasks]);

  const handleTabChange = (tab: Tab) => {
    if (tab === "hq" && !FEATURE_FLAGS.hq) return;
    if (tab === "requests" && !isSuperAdmin) return;
    setActiveTab(tab);
  };

  // --- LOGIC ---
  const checkAutoStrike = useCallback(
    async (currentTasks: Task[]) => {
      const lastCheck = localStorage.getItem("flocify-last-check");
      const needsCheck =
        lastCheck !== today ||
        currentTasks.some(
          (t) =>
            t.status !== "done" &&
            daysBetween(t.due, today) > 0 &&
            !t.history?.some(
              (h) =>
                h.action === "Auto-Strike" && isSameLocalDay(h.timestamp, today)
            )
        );
      if (!needsCheck) return;

      console.log("👮‍♂️ Razia Database...");
      let strikeCount = 0;
      let strikeErrors = 0;
      let updatedTasks = currentTasks;

      for (const t of currentTasks) {
        if (t.status !== "done" && daysBetween(t.due, today) > 0) {
          const alreadyStriked = t.history?.some(
            (h) =>
              h.action === "Auto-Strike" && isSameLocalDay(h.timestamp, today)
          );
          if (!alreadyStriked) {
            strikeCount++;
            const newHistory = [
              ...(t.history || []),
              {
                id: generateId("h-strike"),
                user: "SYSTEM",
                action: "Auto-Strike",
                detail: `Telat ${daysBetween(t.due, today)} hari. Strike +1.`,
                timestamp: getTimestamp(),
              },
            ];
            const updatedTask: Task = {
              ...t,
              strikes: (t.strikes || 0) + 1,
              history: newHistory,
            };
            updatedTasks = updatedTasks.map((task) =>
              task.id === t.id ? updatedTask : task
            );

            const { error: updateError } = await supabase
              .from("tasks")
              .update({ strikes: updatedTask.strikes, history: newHistory })
              .eq("id", t.id);
            if (updateError) {
              strikeErrors += 1;
              continue;
            }
            const { error: notifError } = await supabase
              .from("notifications")
              .insert({
                id: generateId("n"),
                user_id: t.pic,
                message: `⚠️ STRIKE! Tugas "${t.title}" telat. ${buildTaskTag(
                  t.id
                )}`,
                type: "danger",
                is_read: false,
                timestamp: getTimestamp(),
              });
            if (notifError) strikeErrors += 1;
          }
        }
      }
      if (strikeCount > 0) {
        void dialog.alert({
          title: "System Alert",
          message: `${strikeCount} tugas telat hari ini.`,
          tone: "danger",
        });
      }
      if (strikeCount > 0) setTasks(updatedTasks);
      if (strikeErrors > 0) {
        await dialog.alert({
          title: "Sinkronisasi Gagal",
          message:
            "Sebagian data strike gagal tersimpan. Coba refresh atau ulangi.",
          tone: "danger",
        });
      }
      localStorage.setItem("flocify-last-check", today);
    },
    [today, setTasks, dialog]
  );

  const fetchFromDatabase = useCallback(async () => {
    const { data: dbTasks } = await supabase.from("tasks").select("*");
    if (dbTasks) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedTasks: Task[] = dbTasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        division: t.division,
        pic: t.pic,
        members: t.members || [],
        priority: t.priority,
        start: t.start_date,
        due: t.due_date,
        status: t.status,
        output: t.output || "",
        strikes: t.strikes || 0,
        subtasks: t.subtasks || [],
        history: t.history || [],
      }));
      setTasks(mappedTasks);
      checkAutoStrike(mappedTasks);
    }
    const { data: dbNotifs } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (dbNotifs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedNotifs: AppNotification[] = dbNotifs.map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        message: n.message,
        type: n.type,
        isRead: n.is_read,
        timestamp: n.timestamp,
      }));
      setNotifications(mappedNotifs);
    }
  }, [checkAutoStrike]);

  useEffect(() => {
    const initApp = async () => {
      const savedUser = localStorage.getItem("flocify-user");
      if (savedUser) {
        setMe(savedUser);
        setIsLoggedIn(true);
      }
      await fetchFromDatabase();
      setIsLoading(false);
    };
    initApp();
  }, [fetchFromDatabase]);

  // --- FITUR BARU: TUTUP BUKU MINGGUAN ---
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

    setIsLoading(true);

    // 1. Simpan ke Arsip
    const { error: archiveError } = await supabase.from("archives").insert({
      id: generateId("arc"),
      title: sprintName,
      closed_by: me,
      total_done: doneTasks.length,
      tasks_data: doneTasks, // Simpan seluruh object task
    });

    if (archiveError) {
      await dialog.alert({
        title: "Gagal Mengarsipkan",
        message: archiveError.message,
        tone: "danger",
      });
      setIsLoading(false);
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
      setIsLoading(false);
      return;
    }

    // 3. Notifikasi Sukses
    const { error: notifError } = await supabase.from("notifications").insert({
      id: generateId("n-close"),
      user_id: "All",
      message: `🏁 SPRINT CLOSED: "${sprintName}" telah diarsipkan oleh ${me}.`,
      type: "success",
      timestamp: getTimestamp(),
    });

    await dialog.alert({
      title: "Tutup Buku Berhasil",
      message: notifError
        ? "Arsip tersimpan, tapi notifikasi gagal dikirim."
        : "Cek menu Laporan untuk melihat arsip.",
      tone: notifError ? "danger" : "default",
    });
    window.location.reload();
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

    setIsLoading(true);
    const { error: resetTasksError } = await supabase
      .from("tasks")
      .delete()
      .neq("id", "0");
    if (resetTasksError) {
      await dialog.alert({
        title: "Reset Gagal",
        message: resetTasksError.message,
        tone: "danger",
      });
      setIsLoading(false);
      return;
    }
    const { error: resetNotifsError } = await supabase
      .from("notifications")
      .delete()
      .neq("id", "0");
    if (resetNotifsError) {
      await dialog.alert({
        title: "Reset Gagal",
        message: resetNotifsError.message,
        tone: "danger",
      });
      setIsLoading(false);
      return;
    }
    const { error: resetArchivesError } = await supabase
      .from("archives")
      .delete()
      .neq("id", "0"); // Reset Arsip juga biar bersih
    if (resetArchivesError) {
      await dialog.alert({
        title: "Reset Gagal",
        message: resetArchivesError.message,
        tone: "danger",
      });
      setIsLoading(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seedTasks = INITIAL_TASKS.map((t: any) => ({
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
      history: t.history,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seedNotifs = INITIAL_NOTIFICATIONS.map((n: any) => ({
      id: n.id,
      user_id: n.userId,
      message: n.message,
      type: n.type,
      is_read: n.isRead,
      timestamp: n.timestamp,
    }));

    const { error: seedTasksError } = await supabase
      .from("tasks")
      .insert(seedTasks);
    if (seedTasksError) {
      await dialog.alert({
        title: "Reset Gagal",
        message: seedTasksError.message,
        tone: "danger",
      });
      setIsLoading(false);
      return;
    }
    const { error: seedNotifsError } = await supabase
      .from("notifications")
      .insert(seedNotifs);
    if (seedNotifsError) {
      await dialog.alert({
        title: "Reset Gagal",
        message: seedNotifsError.message,
        tone: "danger",
      });
      setIsLoading(false);
      return;
    }
    await dialog.alert({
      title: "Reset Berhasil",
      message: "Data dummy sudah dimuat ulang.",
    });
    window.location.reload();
  };

  // --- CRUD HANDLERS ---
  const handleUpdateStatus = async (id: string, status: TaskStatus) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;

    const timestamp = getTimestamp();
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
    const updatedTask: Task = { ...task, status, history: nextHistory };

    setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)));
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ status, history: nextHistory })
      .eq("id", id);
    if (updateError) {
      await dialog.alert({
        title: "Gagal Update Status",
        message: updateError.message,
        tone: "danger",
      });
      setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
      return;
    }

    if (status === "review") {
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          id: generateId("n-rev"),
          user_id: "Zaenal",
          message: `🔍 REVIEW: ${me} -> "${task.title}". ${buildTaskTag(
            task.id
          )}`,
          type: "warning",
          timestamp,
        });
      if (notifError) {
        await dialog.alert({
          title: "Notifikasi Gagal",
          message: notifError.message,
          tone: "danger",
        });
      }
    }
  };

  const handleSaveTask = async (task: Task) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbPayload: any = {
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
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          id: generateId("n-new"),
          user_id: task.pic,
          message: `✨ TUGAS BARU: "${task.title}". ${buildTaskTag(task.id)}`,
          type: "info",
          timestamp: getTimestamp(),
        });
      if (notifError) {
        await dialog.alert({
          title: "Tugas Tersimpan",
          message: "Tugas tersimpan, tapi notifikasi gagal dikirim.",
          tone: "danger",
        });
      }
    }
    await fetchFromDatabase();
    handleCloseModal();
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
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    const { error: readError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
    if (readError) {
      await dialog.alert({
        title: "Gagal Memperbarui",
        message: readError.message,
        tone: "danger",
      });
      await fetchFromDatabase();
    }
  };

  const handleClearNotifs = async () => {
    setNotifications((prev) => prev.filter((n) => n.userId !== me));
    const { error: clearError } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", me);
    if (clearError) {
      await dialog.alert({
        title: "Gagal Menghapus",
        message: clearError.message,
        tone: "danger",
      });
      await fetchFromDatabase();
    }
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
    (t) => t.pic === me || (t.members && t.members.includes(me))
  );
  const overdueTasks = filteredTasks.filter(
    (t) => t.status !== "done" && daysBetween(t.due, today) > 0
  );

  if (isLoading)
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400">
        Syncing...
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
        {["my", "all", "timeline", "calendar", "overdue"].includes(
          effectiveTab
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
        {FEATURE_FLAGS.hq && effectiveTab === "hq" && (
          <StrategicDashboard tasks={tasks} />
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
        {effectiveTab === "performance" && (
          <PerformanceTable tasks={tasks} today={today} />
        )}
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
