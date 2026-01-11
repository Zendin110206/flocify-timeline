// src/app/task/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  XCircle,
  ShieldAlert,
  Sparkles,
  User,
  FileText,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Task, HistoryLog } from "@/lib/types";
import { STATUS_CONFIG, cn, daysBetween, formatDate } from "@/lib/utils";
import { ADMINS, SUPER_ADMIN } from "@/lib/data";
import { useDialog } from "@/components/ui/DialogProvider";

type HistoryMeta = {
  icon: React.ElementType;
  label: string;
  tone: string;
  badge?: string;
};

type TaskRow = {
  id: string;
  title: string;
  division: Task["division"];
  pic: string;
  members: Task["members"] | null;
  priority: Task["priority"];
  start_date: string;
  due_date: string;
  status: Task["status"];
  output: string | null;
  strikes: number | null;
  subtasks: Task["subtasks"] | null;
  history: Task["history"] | null;
};

const createId = (prefix: string, timestamp: string) =>
  `${prefix}-${timestamp.replace(/[:.]/g, "")}`;
const buildTaskTag = (taskId: string) => `[task:${taskId}]`;
const getStoredUser = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("flocify-user") || "";
};

const HISTORY_META: Record<string, HistoryMeta> = {
  Created: {
    icon: Sparkles,
    label: "Created",
    tone: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
  },
  "Status Update": {
    icon: BadgeCheck,
    label: "Status Update",
    tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  Rescheduled: {
    icon: CalendarClock,
    label: "Rescheduled",
    tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  },
  "Auto-Strike": {
    icon: ShieldAlert,
    label: "Auto-Strike",
    tone: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
  },
  Comment: {
    icon: MessageSquare,
    label: "Comment",
    tone: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
  "Deadline Request": {
    icon: CalendarClock,
    label: "Deadline Request",
    tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  },
  "Deadline Approved": {
    icon: CheckCircle2,
    label: "Deadline Approved",
    tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  "Deadline Rejected": {
    icon: XCircle,
    label: "Deadline Rejected",
    tone: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
  },
  Completed: {
    icon: CheckCircle2,
    label: "Completed",
    tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
};

const mapTask = (data: TaskRow): Task => ({
  id: data.id,
  title: data.title,
  division: data.division,
  pic: data.pic,
  members: data.members || [],
  priority: data.priority,
  start: data.start_date,
  due: data.due_date,
  status: data.status,
  output: data.output || "",
  strikes: data.strikes || 0,
  subtasks: data.subtasks || [],
  history: data.history || [],
});

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function TaskDetailPage() {
  const params = useParams();
  const dialog = useDialog();
  const taskId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser] = useState(getStoredUser);
  const [commentText, setCommentText] = useState("");
  const [requestDate, setRequestDate] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [decisionNote, setDecisionNote] = useState("");

  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId) return;
      setIsLoading(true);
      setError("");
      const { data, error: fetchError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .maybeSingle();
      if (fetchError) {
        setError(fetchError.message);
      } else if (!data) {
        setError("Task tidak ditemukan.");
      } else {
        setTask(mapTask(data));
      }
      setIsLoading(false);
    };
    fetchTask();
  }, [taskId]);

  const {
    history,
    subtasks,
    output,
    title,
    pic,
    members = [],
    division,
    priority,
    start,
    due,
    status,
    strikes,
  } = task || {};

  const totalSubtasks = subtasks?.length || 0;
  const completedSubtasks =
    subtasks?.filter((sub) => sub.isCompleted).length || 0;
  const progressPercent =
    totalSubtasks === 0
      ? 0
      : Math.round((completedSubtasks / totalSubtasks) * 100);

  const sortedHistory = useMemo(() => {
    return [...(history || [])].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [history]);

  const comments = sortedHistory.filter((log) => log.action === "Comment");
  const latestDeadlineRequest = sortedHistory.find(
    (log) => log.action === "Deadline Request"
  );
  const requestTimestamp = latestDeadlineRequest
    ? new Date(latestDeadlineRequest.timestamp).getTime()
    : 0;
  const latestDecision = latestDeadlineRequest
    ? sortedHistory.find(
        (log) =>
          (log.action === "Deadline Approved" ||
            log.action === "Deadline Rejected") &&
          new Date(log.timestamp).getTime() > requestTimestamp
      )
    : undefined;
  const isRequestPending = !!latestDeadlineRequest && !latestDecision;

  const outputLinks = useMemo(() => {
    if (!output) return [];
    return output.match(/https?:\/\/[^\s]+/g) || [];
  }, [output]);

  const parseRequestDates = (
    detail: string
  ): { from: string; to: string } | null => {
    const matches = detail.match(/\d{4}-\d{2}-\d{2}/g);
    if (!matches || matches.length === 0) return null;
    const from = matches[0];
    const to = matches[1] ?? matches[0];
    if (!from || !to) return null;
    return { from, to };
  };

  const formatRequestDetail = (detail: string) => {
    const parsed = parseRequestDates(detail);
    if (!parsed) return detail;
    return `Request: ${formatDate(parsed.from)} -> ${formatDate(parsed.to)}`;
  };

  const formatDecisionDetail = (detail: string) => {
    const parsed = parseRequestDates(detail);
    if (!parsed) return detail;
    return `${formatDate(parsed.from)} -> ${formatDate(parsed.to)}`;
  };

  const isSuperAdmin = currentUser === SUPER_ADMIN;
  const isAdmin = ADMINS.includes(currentUser);
  const isAssigned =
    !!currentUser && (pic === currentUser || members.includes(currentUser));
  const canComment = isAdmin || isAssigned;
  const canRequestDeadline = !isSuperAdmin && isAssigned && !isRequestPending;
  const requestHint = !currentUser
    ? "Login dari Dashboard untuk request perubahan."
    : isRequestPending
    ? "Masih ada request yang menunggu approval."
    : !isAssigned
    ? "Hanya PIC atau member yang bisa request perubahan."
    : "Hanya Zaenal yang bisa menyetujui dan mengubah deadline.";

  const handleAddComment = async () => {
    if (!task) return;
    if (!currentUser) {
      await dialog.alert({
        title: "Login Dibutuhkan",
        message: "Silakan login dari Dashboard untuk memberi komentar.",
      });
      return;
    }
    if (!commentText.trim()) {
      await dialog.alert({
        title: "Komentar Kosong",
        message: "Tulis komentar terlebih dahulu.",
        tone: "danger",
      });
      return;
    }

    const timestamp = new Date().toISOString();
    const newLog: HistoryLog = {
      id: createId("h", timestamp),
      user: currentUser,
      action: "Comment",
      detail: commentText.trim(),
      timestamp,
    };
    const nextHistory = [newLog, ...(history || [])];
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ history: nextHistory })
      .eq("id", task.id);
    if (updateError) {
      await dialog.alert({
        title: "Gagal Menyimpan",
        message: updateError.message,
        tone: "danger",
      });
      return;
    }
    setTask({ ...task, history: nextHistory });
    setCommentText("");
  };

  const handleRequestDeadline = async () => {
    if (!task) return;
    if (!currentUser) {
      await dialog.alert({
        title: "Login Dibutuhkan",
        message: "Silakan login dari Dashboard untuk mengajukan perubahan.",
      });
      return;
    }
    if (!requestDate) {
      await dialog.alert({
        title: "Tanggal Kosong",
        message: "Pilih tanggal deadline yang diusulkan.",
        tone: "danger",
      });
      return;
    }
    if (start && requestDate < start) {
      await dialog.alert({
        title: "Tanggal Tidak Valid",
        message: "Deadline baru tidak boleh lebih cepat dari tanggal mulai.",
        tone: "danger",
      });
      return;
    }
    if (!requestReason.trim()) {
      await dialog.alert({
        title: "Alasan Dibutuhkan",
        message: "Jelaskan alasan perubahan deadline.",
        tone: "danger",
      });
      return;
    }

    const timestamp = new Date().toISOString();
    const newLog: HistoryLog = {
      id: createId("h", timestamp),
      user: currentUser,
      action: "Deadline Request",
      detail: `Request: ${due} -> ${requestDate}`,
      reason: requestReason.trim(),
      timestamp,
    };

    const nextHistory = [newLog, ...(history || [])];
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ history: nextHistory })
      .eq("id", task.id);
    if (updateError) {
      await dialog.alert({
        title: "Gagal Mengirim",
        message: updateError.message,
        tone: "danger",
      });
      return;
    }
    const { error: notifError } = await supabase.from("notifications").insert({
      id: createId("n-req", timestamp),
      user_id: SUPER_ADMIN,
      message: `Request deadline baru untuk "${task.title}" dari ${currentUser}. ${buildTaskTag(
        task.id
      )}`,
      type: "warning",
      timestamp,
    });
    if (notifError) {
      await dialog.alert({
        title: "Request Terkirim",
        message: "Request tersimpan, tapi notifikasi gagal dikirim.",
        tone: "danger",
      });
    }
    setTask({ ...task, history: nextHistory });
    setRequestDate("");
    setRequestReason("");
    await dialog.alert({
      title: "Request Terkirim",
      message: "Permintaan dikirim ke Zaenal untuk approval.",
    });
  };

  const handleApproveRequest = async () => {
    if (!task || !latestDeadlineRequest) return;
    const parsed = parseRequestDates(latestDeadlineRequest.detail);
    if (!parsed?.to) {
      await dialog.alert({
        title: "Request Tidak Valid",
        message: "Tanggal request tidak ditemukan.",
        tone: "danger",
      });
      return;
    }
    const confirmed = await dialog.confirm({
      title: "Approve Deadline",
      message: `Set deadline baru ke ${formatDate(parsed.to)}?`,
      confirmText: "Approve",
      cancelText: "Batal",
    });
    if (!confirmed) return;

    const timestamp = new Date().toISOString();
    const approvalLog: HistoryLog = {
      id: createId("h", timestamp),
      user: currentUser,
      action: "Deadline Approved",
      detail: `Approved: ${due} -> ${parsed.to}`,
      reason: decisionNote.trim() || undefined,
      timestamp,
    };

    const nextHistory = [approvalLog, ...(history || [])];
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ due_date: parsed.to, history: nextHistory })
      .eq("id", task.id);
    if (updateError) {
      await dialog.alert({
        title: "Gagal Mengubah Deadline",
        message: updateError.message,
        tone: "danger",
      });
      return;
    }
    const { error: notifError } = await supabase.from("notifications").insert({
      id: createId("n-appr", timestamp),
      user_id: latestDeadlineRequest.user,
      message: `Deadline "${task.title}" disetujui. Deadline baru: ${formatDate(
        parsed.to
      )}. ${buildTaskTag(task.id)}`,
      type: "success",
      timestamp,
    });
    if (notifError) {
      await dialog.alert({
        title: "Deadline Disetujui",
        message: "Deadline tersimpan, tapi notifikasi gagal dikirim.",
        tone: "danger",
      });
    }

    setTask({ ...task, due: parsed.to, history: nextHistory });
    setDecisionNote("");
    await dialog.alert({
      title: "Deadline Disetujui",
      message: "Deadline berhasil diperbarui.",
    });
  };

  const handleRejectRequest = async () => {
    if (!task || !latestDeadlineRequest) return;
    const parsed = parseRequestDates(latestDeadlineRequest.detail);
    const confirmed = await dialog.confirm({
      title: "Tolak Request",
      message: "Tolak request perubahan deadline ini?",
      confirmText: "Tolak",
      cancelText: "Batal",
      tone: "danger",
    });
    if (!confirmed) return;

    const timestamp = new Date().toISOString();
    const rejectLog: HistoryLog = {
      id: createId("h", timestamp),
      user: currentUser,
      action: "Deadline Rejected",
      detail: parsed
        ? `Rejected: ${parsed.from} -> ${parsed.to}`
        : "Rejected request deadline",
      reason: decisionNote.trim() || undefined,
      timestamp,
    };

    const nextHistory = [rejectLog, ...(history || [])];
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ history: nextHistory })
      .eq("id", task.id);
    if (updateError) {
      await dialog.alert({
        title: "Gagal Menolak Request",
        message: updateError.message,
        tone: "danger",
      });
      return;
    }
    const { error: notifError } = await supabase.from("notifications").insert({
      id: createId("n-rej", timestamp),
      user_id: latestDeadlineRequest.user,
      message: `Request deadline untuk "${task.title}" ditolak. ${buildTaskTag(
        task.id
      )}`,
      type: "danger",
      timestamp,
    });
    if (notifError) {
      await dialog.alert({
        title: "Request Ditolak",
        message: "Keputusan tersimpan, tapi notifikasi gagal dikirim.",
        tone: "danger",
      });
    }

    setTask({ ...task, history: nextHistory });
    setDecisionNote("");
    await dialog.alert({
      title: "Request Ditolak",
      message: "Request deadline ditolak.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400">
        Syncing...
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {error || "Task tidak ditemukan"}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Pastikan link yang dibuka sudah benar.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <ArrowLeft size={16} /> Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-indigo-400 transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Detail tugas & aktivitas tim
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span
              className={cn(
                "rounded-full border px-3 py-1",
                STATUS_CONFIG[status!].style
              )}
            >
              {STATUS_CONFIG[status!].label}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {division}
            </span>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
              {priority?.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr,1fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <ClipboardList size={18} className="text-indigo-500" />
                  <h2 className="text-base font-bold">Checklist Progress</h2>
                </div>
              </div>
              <div className="px-6 py-5">
                {totalSubtasks === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Belum ada checklist untuk tugas ini.
                  </p>
                ) : (
                  <>
                    <div className="mb-3 flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">
                        Progress
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {completedSubtasks}/{totalSubtasks} ({progressPercent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="mt-4 space-y-2">
                      {subtasks?.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/40"
                        >
                          <span
                            className={cn(
                              "flex items-center gap-2",
                              sub.isCompleted
                                ? "text-slate-400 line-through"
                                : "text-slate-700 dark:text-slate-200"
                            )}
                          >
                            <CheckCircle2
                              size={16}
                              className={
                                sub.isCompleted
                                  ? "text-emerald-500"
                                  : "text-slate-300 dark:text-slate-600"
                              }
                            />
                            {sub.title}
                          </span>
                          <span className="text-[10px] uppercase tracking-wide text-slate-400">
                            {sub.isCompleted ? "Done" : "Todo"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <CalendarDays size={18} className="text-indigo-500" />
                  <h2 className="text-base font-bold">Activity Timeline</h2>
                </div>
              </div>
              <div className="px-6 py-5">
                {sortedHistory.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Belum ada aktivitas tercatat.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {sortedHistory.map((log) => {
                      const meta = HISTORY_META[log.action] || {
                        icon: CalendarClock,
                        label: log.action,
                        tone: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                      };
                      const Icon = meta.icon;
                      return (
                        <div key={log.id} className="flex gap-4">
                          <div
                            className={cn(
                              "mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl",
                              meta.tone
                            )}
                          >
                            <Icon size={16} />
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                {meta.label}
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatDateTime(log.timestamp)}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                oleh <strong>{log.user}</strong>
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                              {log.action === "Deadline Request"
                                ? formatRequestDetail(log.detail)
                                : log.action === "Deadline Approved" ||
                                  log.action === "Deadline Rejected"
                                ? formatDecisionDetail(log.detail)
                                : log.detail}
                            </p>
                            {log.reason && (
                              <p className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm italic text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                                &quot;{log.reason}&quot;
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <MessageSquare size={18} className="text-indigo-500" />
                  <h2 className="text-base font-bold">Komentar</h2>
                </div>
              </div>
              <div className="px-6 py-5 space-y-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Belum ada komentar.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>{log.user}</span>
                          <span>{formatDateTime(log.timestamp)}</span>
                        </div>
                        <p className="mt-2 text-sm">{log.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Tambah komentar
                  </label>
                  <textarea
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900"
                    rows={3}
                    placeholder="Tulis komentar atau update singkat..."
                    disabled={!canComment}
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      {canComment
                        ? "Komentar akan tercatat di history."
                        : "Hanya PIC/member yang bisa komentar."}
                    </p>
                    <button
                      onClick={handleAddComment}
                      disabled={!canComment}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Kirim
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <User size={18} className="text-indigo-500" />
                  <h2 className="text-base font-bold">Overview</h2>
                </div>
              </div>
              <div className="px-6 py-5 space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">PIC</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {pic}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    Members
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {members.length === 0 ? "-" : members.join(", ")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    Durasi
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {daysBetween(start!, due!) + 1} hari
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    Mulai
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {formatDate(start!)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    Deadline
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {formatDate(due!)}
                  </span>
                </div>
                {strikes ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
                    Strike aktif: <strong>{strikes}</strong>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <FileText size={18} className="text-indigo-500" />
                  <h2 className="text-base font-bold">Output / Bukti</h2>
                </div>
              </div>
              <div className="px-6 py-5">
                {output ? (
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p className="whitespace-pre-line">{output}</p>
                    {outputLinks.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Link terkait
                        </p>
                        {outputLinks.map((link) => (
                          <a
                            key={link}
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                          >
                            {link}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Belum ada output yang dicatat.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <CalendarClock size={18} className="text-indigo-500" />
                  <h2 className="text-base font-bold">
                    Request Deadline Change
                  </h2>
                </div>
              </div>
              <div className="px-6 py-5 space-y-4 text-sm">
                {latestDeadlineRequest && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                    <p className="text-xs font-semibold uppercase tracking-wider">
                      Request Terakhir
                    </p>
                    <p className="mt-1 text-sm">
                      {formatRequestDetail(latestDeadlineRequest.detail)}
                    </p>
                    {latestDeadlineRequest.reason && (
                      <p className="mt-2 text-xs italic">
                        &quot;{latestDeadlineRequest.reason}&quot;
                      </p>
                    )}
                    <p className="mt-2 text-xs text-amber-600/80">
                      {latestDecision
                        ? latestDecision.action === "Deadline Approved"
                          ? "Disetujui oleh Zaenal."
                          : "Ditolak oleh Zaenal."
                        : "Menunggu approval Zaenal."}
                    </p>
                    {latestDecision?.reason && (
                      <p className="mt-2 text-xs italic text-amber-700 dark:text-amber-300">
                        Catatan: &quot;{latestDecision.reason}&quot;
                      </p>
                    )}
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Deadline baru
                    </label>
                    <input
                      type="date"
                      value={requestDate}
                      onChange={(event) => setRequestDate(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900"
                      disabled={!canRequestDeadline}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Alasan
                    </label>
                    <textarea
                      value={requestReason}
                      onChange={(event) => setRequestReason(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900"
                      rows={3}
                      placeholder="Jelaskan alasan perubahan deadline..."
                      disabled={!canRequestDeadline}
                    />
                  </div>
                  <button
                    onClick={handleRequestDeadline}
                    disabled={!canRequestDeadline}
                    className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Kirim Request
                  </button>
                  <p className="text-xs text-slate-400">{requestHint}</p>
                </div>
                {isSuperAdmin && latestDeadlineRequest && isRequestPending && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 dark:border-emerald-900/40 dark:bg-emerald-900/20">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Approval Zone
                    </p>
                    <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-200">
                      Request dari <strong>{latestDeadlineRequest.user}</strong>{" "}
                      untuk deadline{" "}
                      <strong>
                        {formatRequestDetail(latestDeadlineRequest.detail).replace(
                          "Request: ",
                          ""
                        )}
                      </strong>
                      .
                    </p>
                    <div className="mt-3 space-y-2">
                      <label className="text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                        Catatan keputusan (opsional)
                      </label>
                      <textarea
                        value={decisionNote}
                        onChange={(event) => setDecisionNote(event.target.value)}
                        className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-emerald-900/50 dark:bg-slate-900 dark:text-emerald-100 dark:focus:ring-emerald-900"
                        rows={2}
                        placeholder="Tambahkan catatan jika diperlukan..."
                      />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={handleApproveRequest}
                        className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={handleRejectRequest}
                        className="flex-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}


