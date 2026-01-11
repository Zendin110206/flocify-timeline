// src/components/features/PerformanceTable.tsx
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Task } from "@/lib/types";
import {
  Trophy,
  TrendingUp,
  Medal,
  AlertOctagon,
  ShieldCheck,
  Info,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Gavel,
  X,
  Printer,
} from "lucide-react";
import { ADMINS, PEOPLE } from "@/lib/data";

interface PerformanceTableProps {
  tasks: Task[];
  today: string;
}

export function PerformanceTable({ tasks, today }: PerformanceTableProps) {
  const getStoredUser = () => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("flocify-user") || "";
  };
  const [currentUser] = useState(getStoredUser);
  const [selectedSP, setSelectedSP] = useState<{
    name: string;
    count: number;
  } | null>(null);

  const isAdmin = ADMINS.includes(currentUser);

  // 1. OLAH DATA (Kalkulasi Statistik Real-Time)
  const allMembers = PEOPLE;
  // --- UPDATE LOGIKA STATS (GANTI BAGIAN INI) ---
  const stats = allMembers.map((member) => {
    const memberTasks = tasks.filter((t) => t.pic === member);
    const total = memberTasks.length;
    const done = memberTasks.filter((t) => t.status === "done").length;

    // Perhitungan Workload Aktif (Bukan Done)
    const activeTasks = memberTasks.filter((t) => t.status !== "done");
    const activeCount = activeTasks.length;
    const highPriorityActive = activeTasks.filter(
      (t) => t.priority === "high"
    ).length;

    // Aturan Workload (Sesuai Codex Logic)
    const isOverloaded = highPriorityActive > 3 || activeCount > 5;
    const isIdle = activeCount === 0;
    const workloadStatus = isOverloaded
      ? "overloaded"
      : isIdle
      ? "idle"
      : "steady";

    const historicalStrikes = memberTasks.reduce(
      (acc, curr) => acc + (curr.strikes || 0),
      0
    );
    const activeOverdue = memberTasks.filter(
      (t) => t.status !== "done" && t.due < today
    ).length;
    const totalIssues = Math.max(historicalStrikes, activeOverdue);

    const efficiency = total === 0 ? 0 : Math.round((done / total) * 100);
    const score = Math.round(done * 10 - totalIssues * 15 + efficiency / 2);

    let status = "N/A";
    let statusColor = "";

    if (totalIssues > 0) {
      status = "Warning";
      statusColor =
        "text-rose-600 bg-rose-50 border-rose-100 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20";
    } else if (efficiency >= 80 && total >= 2) {
      status = "Excellent";
      statusColor =
        "text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20";
    } else if (efficiency >= 50) {
      status = "Good";
      statusColor =
        "text-blue-600 bg-blue-50 border-blue-100 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20";
    } else {
      status = "Low Perf";
      statusColor =
        "text-slate-500 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700";
    }

    return {
      member,
      total,
      done,
      totalIssues,
      efficiency,
      score,
      status,
      statusColor,
      workloadStatus, // Data baru
      activeCount, // Data baru
      highPriorityActive, // Data baru
    };
  });

  // Urutkan Ranking (Skor Tertinggi di Atas)
  const sortedStats = stats.sort((a, b) => b.score - a.score);
  const topThree = sortedStats.slice(0, 3);

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER TANGGAL */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Executive Dashboard
        </h2>
        <span className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
          Last Updated:{" "}
          {new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>

      {/* --- SECTION 1: PODIUM (KARTU JUARA) --- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {topThree.map((stat, index) => {
          let ringColor = "ring-slate-200 dark:ring-slate-700";
          let icon = <Medal size={24} className="text-slate-400" />;
          let label = "Runner Up";

          if (index === 0) {
            ringColor = "ring-amber-400 dark:ring-amber-500";
            icon = (
              <Trophy
                size={28}
                className="text-amber-500"
                fill="currentColor"
              />
            );
            label = "MVP of The Week";
          } else if (index === 1) {
            ringColor = "ring-slate-300 dark:ring-slate-500";
            icon = (
              <Medal size={24} className="text-slate-400" fill="currentColor" />
            );
            label = "2nd Place";
          } else {
            ringColor = "ring-orange-300 dark:ring-orange-500";
            icon = (
              <Medal
                size={24}
                className="text-orange-400"
                fill="currentColor"
              />
            );
            label = "3rd Place";
          }

          return (
            <div
              key={stat.member}
              className="relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800 transition-all hover:shadow-md"
            >
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 bg-linear-to-br from-indigo-500/10 to-transparent rounded-full blur-2xl"></div>

              <div className="mb-4 flex items-center justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-[10px] font-bold text-slate-700 ring-4 ${ringColor} dark:bg-slate-800 dark:text-slate-200`}
                >
                  {getInitials(stat.member)}
                </div>
                <div>{icon}</div>
              </div>

              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                {stat.member}
              </h3>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                {label}
              </p>

              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <div>
                  <p className="text-[10px] text-slate-400">Total Skor</p>
                  <p
                    className={`text-xl font-bold ${
                      stat.score < 0
                        ? "text-rose-500"
                        : "text-indigo-600 dark:text-indigo-400"
                    }`}
                  >
                    {stat.score}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">Efficiency</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {stat.efficiency}%
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- SECTION 2: TABEL DETAIL --- */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="text-indigo-500" size={20} />
            Performance Analytics
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Analisa detail kedisiplinan dan produktivitas setiap anggota.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 font-bold text-center">Rank</th>
                <th className="px-6 py-4 font-bold">Member</th>
                <th className="px-6 py-4 font-bold text-center">
                  Productivity
                </th>
                <th className="px-6 py-4 font-bold text-center">Points</th>
                <th className="px-6 py-4 font-bold text-center">Discipline</th>
                <th className="px-6 py-4 font-bold text-center">Status</th>
                <th className="px-6 py-4 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedStats.map((stat, index) => (
                <tr
                  key={stat.member}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs font-black text-slate-400">
                      #{index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                        {getInitials(stat.member)}
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {stat.member}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 justify-center">
                      <div className="flex-1 h-2 w-20 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800 max-w-20">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            stat.efficiency >= 80
                              ? "bg-emerald-500"
                              : stat.efficiency >= 50
                              ? "bg-blue-500"
                              : "bg-amber-500"
                          )}
                          style={{ width: `${stat.efficiency}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                        {stat.done}/{stat.total}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-1 font-black text-sm">
                      <TrendingUp
                        size={14}
                        className={
                          stat.score < 0 ? "text-rose-500" : "text-indigo-500"
                        }
                      />
                      <span
                        className={
                          stat.score < 0
                            ? "text-rose-600"
                            : "text-indigo-600 dark:text-indigo-400"
                        }
                      >
                        {stat.score}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {stat.totalIssues === 0 ? (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <ShieldCheck size={12} /> CLEAN
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                          <AlertOctagon size={12} /> {stat.totalIssues} LATE
                        </div>
                        <span className="text-[9px] text-slate-400 italic">
                          Historical Strikes
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={cn(
                        "inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        stat.statusColor
                      )}
                    >
                      {stat.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {isAdmin && stat.totalIssues > 0 ? (
                      <button
                        onClick={() =>
                          setSelectedSP({
                            name: stat.member,
                            count: stat.totalIssues,
                          })
                        }
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors dark:hover:bg-rose-900/20"
                        title="Issue Warning Letter"
                      >
                        <Gavel size={16} />
                      </button>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-700">
                        -
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedStats.length === 0 && (
            <div className="p-10 text-center text-slate-400">
              Belum ada data untuk dianalisis.
            </div>
          )}
        </div>
      </div>

      {/* --- SECTION 3: REAL-TIME TEAM CAPACITY (WORKLOAD) --- */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="text-indigo-500" size={20} />
              Team Availability Heatmap
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kapasitas beban kerja anggota berdasarkan tugas aktif saat ini.
            </p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((s) => (
            <div
              key={s.member}
              className={cn(
                "p-4 rounded-xl border transition-all",
                s.workloadStatus === "overloaded"
                  ? "bg-rose-50/50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30"
                  : s.workloadStatus === "idle"
                  ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30"
                  : "bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {s.member}
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                    s.workloadStatus === "overloaded"
                      ? "text-rose-600 dark:text-rose-400"
                      : s.workloadStatus === "idle"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  )}
                >
                  {s.workloadStatus}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Task Load</span>
                  <span>{s.activeCount} / 5 Tasks</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      s.workloadStatus === "overloaded"
                        ? "bg-rose-500"
                        : s.workloadStatus === "idle"
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    )}
                    style={{
                      width: `${Math.min((s.activeCount / 5) * 100, 100)}%`,
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      s.highPriorityActive > 0
                        ? "bg-rose-500 animate-pulse"
                        : "bg-slate-300"
                    )}
                  />
                  <span className="text-[10px] text-slate-500">
                    {s.highPriorityActive} High Priority Task
                    {s.highPriorityActive > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- INFO & LEGEND --- */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Info size={18} />
            <h4 className="font-bold text-sm">Kamus Indikator (Legend)</h4>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-emerald-500"></span>
              <div>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  EXCELLENT
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Efisiensi &gt; 80% dan 0 Strike. Target Promosi/Bonus.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-blue-500"></span>
              <div>
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  GOOD
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Efisiensi &gt; 50% dan 0 Strike. Kinerja Aman.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-rose-500"></span>
              <div>
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  WARNING / RISK
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Terdeteksi Strike (Telat) atau produktivitas rendah.
                  Berpotensi SP.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Calculator size={18} />
            <h4 className="font-bold text-sm">Transparansi Kalkulasi Skor</h4>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs font-mono text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Skor = (Done x 10) - (Strike x 15) + (Eff/2)
          </div>
          <ul className="mt-3 space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={12} className="text-emerald-500" />{" "}
              <span>
                <strong className="text-slate-700 dark:text-slate-300">
                  +10 Poin
                </strong>{" "}
                setiap tugas selesai (Done).
              </span>
            </li>
            <li className="flex items-center gap-2">
              <AlertTriangle size={12} className="text-rose-500" />{" "}
              <span>
                <strong className="text-rose-600 dark:text-rose-400">
                  -15 Poin
                </strong>{" "}
                setiap tugas telat (Strike). Hukuman berat.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <TrendingUp size={12} className="text-blue-500" />{" "}
              <span>
                <strong className="text-slate-700 dark:text-slate-300">
                  + Bonus
                </strong>{" "}
                dari tingkat persentase penyelesaian.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* --- MODAL SURAT PERINGATAN (POPUP) --- */}
      {selectedSP && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-950 dark:border dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h3 className="text-lg font-bold text-rose-600 flex items-center gap-2">
                <AlertTriangle /> SURAT PERINGATAN (DRAFT)
              </h3>
              <button
                onClick={() => setSelectedSP(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 font-serif text-slate-800 dark:text-slate-200 leading-relaxed text-sm bg-white dark:bg-slate-950">
              <div className="mb-6 text-center border-b-2 border-slate-800 pb-4 dark:border-slate-200">
                <h2 className="text-xl font-black uppercase tracking-widest">
                  FLOCIFY MANAGEMENT
                </h2>
                <p className="text-xs text-slate-500">
                  Divisi Sumber Daya Manusia & Kepatuhan
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-center font-bold underline">
                  SURAT PERINGATAN{" "}
                  {selectedSP.count >= 3
                    ? "III (TERAKHIR)"
                    : selectedSP.count === 2
                    ? "II"
                    : "I"}
                </p>
                <p>
                  Kepada Yth,
                  <br />
                  Sdr/i. <strong>{selectedSP.name}</strong>
                  <br />
                  di Tempat
                </p>
                <p>Dengan hormat,</p>
                <p className="text-justify">
                  Sehubungan dengan hasil evaluasi kinerja mingguan, Manajemen
                  menemukan tindakan indisipliner berupa keterlambatan
                  penyelesaian tugas (Strike/Overdue) sebanyak{" "}
                  <strong className="text-rose-600">
                    {" "}
                    {selectedSP.count}x{" "}
                  </strong>
                  .
                </p>
                <p className="text-justify">
                  Surat ini diterbitkan sebagai teguran resmi agar Saudara dapat
                  segera memperbaiki kinerja.
                </p>
                <div className="mt-8 flex justify-end">
                  <div className="text-center">
                    <p>
                      {new Date().toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="mt-16 font-bold border-b border-slate-800 dark:border-slate-200 inline-block min-w-37.5">
                      {currentUser}
                    </p>
                    <p className="text-xs">Authorized Admin</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
              <button
                onClick={() => setSelectedSP(null)}
                className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700"
              >
                Batal
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                <Printer size={16} /> Cetak / PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
