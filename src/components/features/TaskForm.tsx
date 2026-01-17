// src/components/features/TaskForm.tsx
import React, { useMemo, useState } from "react";
import {
  Task,
  Division,
  TaskStatus,
  Priority,
  Subtask,
  HistoryLog,
} from "@/lib/types";
import { DIVISIONS, PEOPLE } from "@/lib/data";
import { todayISO, STATUS_CONFIG, formatDate } from "@/lib/utils";
import { useDialog } from "@/components/ui/DialogProvider";
import { usePermission } from "@/hooks/usePermission";
import {
  Check,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  History,
  AlertTriangle,
  Lock,
} from "lucide-react";

interface TaskFormProps {
  initialData?: Task | null;
  onSave: (task: Task) => void;
  onCancel: () => void;
  defaultOwner: string;
  tasks?: Task[];
}

// --- KONSTANTA (Dipindah ke luar biar ESLint senang & performa lebih cepat) ---
const WORKLOAD_RULES = { maxHighPriority: 3, maxActive: 5 };
const WORKLOAD_LABEL = {
  overloaded: "Overloaded",
  steady: "Steady",
  idle: "Idle",
};
const WORKLOAD_DOT = { overloaded: "🔴", steady: "🟡", idle: "🟢" };

export function TaskForm({
  initialData,
  onSave,
  onCancel,
  defaultOwner,
  tasks = [],
}: TaskFormProps) {
  const dialog = useDialog();
  const currentUser = defaultOwner;

  const { isSuperAdmin, isAdmin, canChangeDeadline, canMarkDone } =
    usePermission(currentUser);

  const isPic = initialData ? initialData.pic === currentUser : true;
  const isMember = initialData
    ? initialData.members.includes(currentUser)
    : false;
  const isNewTask = !initialData;
  const isDone = initialData?.status === "done";

  const isLocked = isDone && !isAdmin;
  const canEditCore =
    !isLocked && (isSuperAdmin || isAdmin || isPic || isNewTask);
  const canEditPic = !isLocked && (isSuperAdmin || isAdmin || isNewTask);
  const canEditMembers =
    !isLocked && (isSuperAdmin || isAdmin || isPic || isNewTask);
  const canEditProgress =
    !isLocked && (isSuperAdmin || isAdmin || isPic || isMember || isNewTask);
  const canEditDeadline = !isLocked && (isNewTask || canChangeDeadline());
  const canSelectDone = canMarkDone();
  const isReadOnly = !canEditProgress && !isNewTask;

  const [activeTab, setActiveTab] = useState<"detail" | "history">("detail");
  const [reason, setReason] = useState("");
  const [newSubtask, setNewSubtask] = useState("");

  const [formData, setFormData] = useState<Partial<Task>>(
    initialData || {
      title: "",
      division: "Komunitas",
      pic: defaultOwner,
      members: [],
      priority: "medium",
      start: todayISO(),
      due: todayISO(),
      status: "todo",
      output: "",
      subtasks: [],
      history: [],
    },
  );

  // --- LOGIKA WORKLOAD ---
  const workloadByPerson = useMemo(() => {
    const map: Record<
      string,
      {
        activeCount: number;
        highPriorityCount: number;
        status: "overloaded" | "steady" | "idle";
      }
    > = {};
    const activeTasks = tasks.filter(
      (task) =>
        task.status !== "done" && (!initialData || task.id !== initialData.id),
    );
    PEOPLE.forEach((person) => {
      const myTasks = activeTasks.filter((task) => task.pic === person);
      const activeCount = myTasks.length;
      const highPriorityCount = myTasks.filter(
        (task) => task.priority === "high",
      ).length;
      const status =
        highPriorityCount > WORKLOAD_RULES.maxHighPriority ||
        activeCount > WORKLOAD_RULES.maxActive
          ? "overloaded"
          : activeCount === 0
            ? "idle"
            : "steady";
      map[person] = { activeCount, highPriorityCount, status };
    });
    return map;
  }, [tasks, initialData]); // Dependency aman karena WORKLOAD_RULES sudah diluar

  const selectedWorkload = formData.pic
    ? workloadByPerson[formData.pic]
    : undefined;

  // --- HANDLERS ---
  const toggleMember = (person: string) => {
    if (!canEditMembers) return;
    const current = formData.members || [];
    if (current.includes(person)) {
      setFormData({
        ...formData,
        members: current.filter((p) => p !== person),
      });
    } else {
      setFormData({ ...formData, members: [...current, person] });
    }
  };

  const addSubtask = () => {
    if (!canEditProgress || !newSubtask.trim()) return;
    const sub: Subtask = {
      id: `s${Date.now()}`,
      title: newSubtask,
      isCompleted: false,
    };
    setFormData({ ...formData, subtasks: [...(formData.subtasks || []), sub] });
    setNewSubtask("");
  };

  const removeSubtask = (id: string) => {
    if (!canEditProgress) return;
    setFormData({
      ...formData,
      subtasks: (formData.subtasks || []).filter((s) => s.id !== id),
    });
  };

  const toggleSubtask = (id: string) => {
    if (!canEditProgress) return;
    setFormData({
      ...formData,
      subtasks: (formData.subtasks || []).map((s) =>
        s.id === id ? { ...s, isCompleted: !s.isCompleted } : s,
      ),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!formData.title?.trim()) return;

    if (formData.start && formData.due && formData.start > formData.due) {
      void dialog.alert({
        title: "Tanggal Tidak Valid",
        message: "Tanggal mulai tidak boleh lebih besar dari deadline.",
        tone: "danger",
      });
      return;
    }

    const isDateChanged = initialData && formData.due !== initialData.due;
    if (isDateChanged && !reason.trim()) {
      void dialog.alert({
        title: "Alasan Wajib",
        message: "Wajib isi alasan perubahan deadline!",
        tone: "danger",
      });
      return;
    }

    if (
      formData.status === "done" &&
      !canSelectDone &&
      initialData?.status !== "done"
    ) {
      void dialog.alert({
        title: "Akses Ditolak",
        message: "Hanya Admin yang boleh memvalidasi tugas menjadi Done.",
        tone: "danger",
      });
      return;
    }

    const totalSub = formData.subtasks?.length || 0;
    const doneSub = formData.subtasks?.filter((s) => s.isCompleted).length || 0;
    const isChecklistComplete = totalSub === 0 || doneSub === totalSub;

    if (formData.status === "done" && !isChecklistComplete && !isSuperAdmin) {
      void dialog.alert({
        title: "Checklist Belum Lengkap",
        message: "Selesaikan checklist dulu sebelum status Done.",
        tone: "danger",
      });
      return;
    }

    const newHistory: HistoryLog[] = [...(formData.history || [])];
    const timestamp = new Date().toISOString();

    if (isDateChanged && initialData) {
      newHistory.unshift({
        id: `h${Date.now()}-1`,
        user: defaultOwner,
        action: "Rescheduled",
        detail: `Deadline: ${formatDate(initialData.due)} -> ${formatDate(formData.due!)}`,
        reason: reason,
        timestamp: timestamp,
      });
    }

    if (initialData && formData.status !== initialData.status) {
      newHistory.unshift({
        id: `h${Date.now()}-2`,
        user: defaultOwner,
        action: "Status Update",
        detail: `${STATUS_CONFIG[initialData.status].label} -> ${STATUS_CONFIG[formData.status!].label}`,
        timestamp: timestamp,
      });
    }

    if (!initialData) {
      newHistory.unshift({
        id: `h${Date.now()}`,
        user: defaultOwner,
        action: "Created",
        detail: "Tugas baru dibuat",
        timestamp: timestamp,
      });
    }

    const finalTask: Task = {
      id: initialData?.id || `t${Date.now()}`,
      title: formData.title!,
      division: formData.division as Division,
      pic: formData.pic || defaultOwner,
      members: formData.members || [],
      priority: (formData.priority as Priority) || "medium",
      start: formData.start!,
      due: formData.due!,
      status: formData.status as TaskStatus,
      output: formData.output || "",
      strikes: formData.strikes || 0,
      subtasks: formData.subtasks || [],
      history: newHistory,
    };

    onSave(finalTask);
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {isReadOnly && (
        <div className="bg-amber-100 p-3 text-center text-xs font-bold text-amber-800 border-b border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800">
          🔒 MODE BACA: Anda tidak punya akses edit tugas ini.
        </div>
      )}
      {isLocked && !isReadOnly && (
        <div className="bg-emerald-100 p-3 text-center text-xs font-bold text-emerald-800 border-b border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800">
          ✅ TUGAS SELESAI: Data terkunci. Hubungi Admin untuk membuka kembali.
        </div>
      )}

      <div className="flex border-b border-slate-200 dark:border-slate-700 px-6 mt-2">
        <button
          type="button"
          onClick={() => setActiveTab("detail")}
          className={`mr-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "detail"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
          }`}
        >
          Detail Tugas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "history"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
          }`}
        >
          History & Alibi
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <form
          id="task-form"
          onSubmit={handleSubmit}
          className={`space-y-5 ${activeTab === "detail" ? "block" : "hidden"}`}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Judul Tugas
              </label>
              <input
                type="text"
                disabled={!canEditCore}
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-white disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Divisi
                </label>
                <select
                  disabled={!canEditCore}
                  value={formData.division}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      division: e.target.value as Division,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white disabled:opacity-50"
                >
                  {DIVISIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Prioritas
                </label>
                <select
                  disabled={!canEditCore}
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: e.target.value as Priority,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white disabled:opacity-50"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:bg-slate-800 dark:border-slate-700">
            <div className="mb-3">
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                PIC (Ketua)
              </label>
              <select
                disabled={!canEditPic}
                value={formData.pic}
                onChange={(e) =>
                  setFormData({ ...formData, pic: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-white disabled:opacity-50"
              >
                {PEOPLE.map((person) => {
                  const workload = workloadByPerson[person];
                  const label = workload
                    ? `${WORKLOAD_DOT[workload.status]} ${person} (${WORKLOAD_LABEL[workload.status]})`
                    : person;
                  return (
                    <option key={person} value={person}>
                      {label}
                    </option>
                  );
                })}
              </select>

              {/* --- BAGIAN INI SUDAH DIKEMBALIKAN LENGKAP --- */}
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                <p>
                  Overloaded: &gt;{WORKLOAD_RULES.maxHighPriority} high atau
                  &gt;{WORKLOAD_RULES.maxActive} tugas aktif.
                </p>
                {selectedWorkload && (
                  <p>
                    Beban {formData.pic}: {selectedWorkload.activeCount} aktif •{" "}
                    {selectedWorkload.highPriorityCount} high priority.
                  </p>
                )}
                {initialData && (
                  <p>Indikator tidak menghitung tugas yang sedang diedit.</p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                Members (Tim Bantu)
              </label>
              <div className="flex flex-wrap gap-2">
                {PEOPLE.filter((p) => p !== formData.pic).map((person) => {
                  const isSelected = formData.members?.includes(person);
                  return (
                    <button
                      key={person}
                      type="button"
                      disabled={!canEditMembers}
                      onClick={() => toggleMember(person)}
                      className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                        isSelected
                          ? "bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-900 dark:border-indigo-700 dark:text-indigo-300"
                          : "bg-white border-slate-300 text-slate-600 hover:border-indigo-300 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-400"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isSelected && <Check size={10} />}
                      {person}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Checklist
            </label>
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="space-y-2 mb-3">
                {formData.subtasks?.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2 group">
                    <button
                      type="button"
                      disabled={!canEditProgress}
                      onClick={() => toggleSubtask(sub.id)}
                      className={`text-slate-400 ${sub.isCompleted ? "text-indigo-600" : ""} disabled:opacity-50`}
                    >
                      {sub.isCompleted ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                    <span
                      className={`flex-1 text-sm ${sub.isCompleted ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}`}
                    >
                      {sub.title}
                    </span>
                    {canEditProgress && (
                      <button
                        type="button"
                        onClick={() => removeSubtask(sub.id)}
                        className="text-slate-300 hover:text-rose-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {canEditProgress && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSubtask();
                      }
                    }}
                    className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                    placeholder="Tambah checklist..."
                  />
                  <button
                    type="button"
                    onClick={addSubtask}
                    className="rounded-md bg-slate-100 px-3 py-1.5 dark:bg-slate-700"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Mulai
              </label>
              <input
                type="date"
                disabled={!canEditCore}
                value={formData.start}
                onChange={(e) =>
                  setFormData({ ...formData, start: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white disabled:opacity-50"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                Deadline
                {!canEditDeadline && (
                  <span title="Hanya Zaenal yang bisa ubah deadline setelah dibuat">
                    <Lock size={12} className="text-amber-500" />
                  </span>
                )}
              </label>
              <input
                type="date"
                disabled={!canEditDeadline}
                title={
                  !canEditDeadline ? "Minta Zaenal buat ganti tanggal" : ""
                }
                value={formData.due}
                onChange={(e) =>
                  setFormData({ ...formData, due: e.target.value })
                }
                className={`w-full rounded-lg border px-3 py-2 text-sm dark:bg-slate-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                  initialData && formData.due !== initialData.due
                    ? "border-rose-500 ring-1 ring-rose-500"
                    : "border-slate-300 dark:border-slate-600"
                }`}
              />
            </div>
          </div>

          {initialData && formData.due !== initialData.due && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:bg-rose-900/20 dark:border-rose-800">
              <label className="mb-1 flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-400">
                <AlertTriangle size={16} /> Alasan Perubahan (Wajib)
              </label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-md border border-rose-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-rose-700 dark:text-white"
                placeholder="Kenapa diundur? Jujur aja..."
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Status
            </label>
            <select
              disabled={!canEditProgress}
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as TaskStatus,
                })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white disabled:opacity-50"
            >
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <option
                  key={key}
                  value={key}
                  disabled={
                    key === "done" &&
                    !canSelectDone &&
                    initialData?.status !== "done"
                  }
                >
                  {val.label}{" "}
                  {key === "done" &&
                  !canSelectDone &&
                  initialData?.status !== "done"
                    ? "(Admin Only)"
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Output / Bukti
            </label>
            <textarea
              disabled={!canEditProgress}
              required
              rows={2}
              value={formData.output}
              onChange={(e) =>
                setFormData({ ...formData, output: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none dark:bg-slate-800 dark:border-slate-600 dark:text-white disabled:opacity-50"
              placeholder="Link GDrive, Screenshot, atau deskripsi hasil..."
            />
          </div>
        </form>

        <div
          className={`space-y-4 ${activeTab === "history" ? "block" : "hidden"}`}
        >
          {formData.history && formData.history.length > 0 ? (
            formData.history.map((log) => (
              <div
                key={log.id}
                className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-700 pb-4 last:pb-0"
              >
                <div className="absolute -left-2.5 top-0 h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900" />
                <div className="text-xs text-slate-400 mb-1">
                  {new Date(log.timestamp).toLocaleString("id-ID")} •{" "}
                  <strong>{log.user}</strong>
                </div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {log.action}
                  </span>
                  <span>{log.detail}</span>
                </div>
                {log.reason && (
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 italic">
                    &quot;{log.reason}&quot;
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-slate-400">
              <History className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Kosong.</p>
            </div>
          )}
        </div>
      </div>

      {!isReadOnly && activeTab === "detail" && (
        <div className="flex gap-3 p-6 border-t border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-slate-300 bg-white py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Batal
          </button>
          <button
            type="submit"
            form="task-form"
            className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-500"
          >
            Simpan
          </button>
        </div>
      )}
      {isReadOnly && (
        <div className="p-6 border-t border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700">
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-lg bg-slate-800 text-white py-2 text-sm hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            Tutup
          </button>
        </div>
      )}
    </div>
  );
}
