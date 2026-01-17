// src/hooks/useTaskData.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Task, AppNotification } from "@/lib/types";
import { todayISO, daysBetween } from "@/lib/utils";
import { useDialog } from "@/components/ui/DialogProvider";

const generateId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const getTimestamp = () => new Date().toISOString();
const isSameLocalDay = (timestamp: string, dayISO: string) => {
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}` === dayISO;
};
const buildTaskTag = (taskId: string) => `[task:${taskId}]`;

export function useTaskData() {
  const dialog = useDialog();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. LOGIKA AUTO STRIKE (Dipindah kesini) ---
  const checkAutoStrike = useCallback(
    async (currentTasks: Task[]) => {
      const today = todayISO();
      const lastCheck = localStorage.getItem("flocify-last-check");

      // Cek apakah perlu razia?
      const needsCheck =
        lastCheck !== today ||
        currentTasks.some(
          (t) =>
            t.status !== "done" &&
            daysBetween(t.due, today) > 0 &&
            !t.history?.some(
              (h) =>
                h.action === "Auto-Strike" &&
                isSameLocalDay(h.timestamp, today),
            ),
        );

      if (!needsCheck) return;

      console.log("👮‍♂️ Razia Database dijalankan oleh System...");
      let strikeCount = 0;

      // Kita iterasi tugas yang telat
      for (const t of currentTasks) {
        if (t.status !== "done" && daysBetween(t.due, today) > 0) {
          const alreadyStriked = t.history?.some(
            (h) =>
              h.action === "Auto-Strike" && isSameLocalDay(h.timestamp, today),
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

            // Update ke Supabase langsung
            await supabase
              .from("tasks")
              .update({
                strikes: (t.strikes || 0) + 1,
                history: newHistory,
              })
              .eq("id", t.id);

            // Kirim Notif Bahaya
            await supabase.from("notifications").insert({
              id: generateId("n"),
              user_id: t.pic,
              message: `⚠️ STRIKE! Tugas "${t.title}" telat. ${buildTaskTag(t.id)}`,
              type: "danger",
              is_read: false,
              timestamp: getTimestamp(),
            });
          }
        }
      }

      if (strikeCount > 0) {
        void dialog.alert({
          title: "System Alert",
          message: `${strikeCount} tugas telat hari ini. Strike point ditambahkan.`,
          tone: "danger",
        });
      }

      localStorage.setItem("flocify-last-check", today);
    },
    [dialog],
  );

  // --- 2. FETCH DATA MANUAL ---
  const fetchData = useCallback(async () => {
    // Ambil Tasks
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
      // Jalankan razia setelah data terambil
      checkAutoStrike(mappedTasks);
    }

    // Ambil Notifikasi
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

    setIsLoading(false);
  }, [checkAutoStrike]);

  // --- 3. REALTIME SUBSCRIPTION (Jantungnya Aplikasi) ---
  useEffect(() => {
    // Load data pertama kali (Bungkus dengan setTimeout)
    setTimeout(() => {
      fetchData();
    }, 0);

    // Pasang "Telinga" (Listener) ke Supabase
    const channel = supabase
      .channel("realtime-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => {
          console.log("⚡ Realtime: Ada update pada Tasks!");
          fetchData();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          console.log("⚡ Realtime: Ada notifikasi baru!");
          fetchData();
        },
      )
      .subscribe();

    // Bersih-bersih kalau komponen ditutup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return {
    tasks,
    setTasks, // Kita export ini biar page.tsx bisa update state optimistik kalau perlu
    notifications,
    setNotifications,
    isLoading,
    refreshData: fetchData, // Fungsi buat paksa refresh manual
  };
}
