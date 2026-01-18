// src/app/report/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  FileText,
  Calendar,
  CheckCircle2,
  User,
  ChevronDown,
  ChevronUp,
  Printer,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Task } from "@/lib/types";

type ArchiveRow = {
  id: string;
  title: string;
  closed_by: string;
  total_done: number;
  created_at: string;
  tasks_data: Task[] | null;
};

export default function ReportPage() {
  const [archives, setArchives] = useState<ArchiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // --- FIX ESLINT: Definisikan fungsi LANGSUNG di dalam useEffect ---
  useEffect(() => {
    const fetchArchives = async () => {
      const { data } = await supabase
        .from("archives")
        .select("*")
        .order("created_at", { ascending: false });

      if (Array.isArray(data)) setArchives(data as ArchiveRow[]);
      setLoading(false);
    };

    fetchArchives();
  }, []); // Array kosong artinya cuma jalan sekali pas halaman dibuka (Aman!)

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <div className="mx-auto max-w-4xl">
        {/* HEADER */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* FIX TOMBOL BACK: Mode gelap jadi abu-abu, bukan putih */}
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-indigo-400 transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Laporan & Arsip</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Rekapitulasi kinerja mingguan tim.
              </p>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="hidden sm:flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 shadow-sm"
          >
            <Printer size={16} /> Print PDF
          </button>
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500 mb-4 dark:border-slate-800 dark:border-t-indigo-400"></div>
            <p>Mengambil data dari gudang...</p>
          </div>
        ) : archives.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center dark:border-slate-800">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900">
              <FileText className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-bold">Belum Ada Laporan</h3>
            <p className="text-slate-500 dark:text-slate-400">
              Lakukan &quot;Tutup Buku&quot; di Dashboard untuk membuat laporan
              baru.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {archives.map((arch) => {
              const tasksData = Array.isArray(arch.tasks_data)
                ? arch.tasks_data
                : [];
              return (
                <div
                  key={arch.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900"
                >
                {/* CARD HEADER (Klik untuk Expand) */}
                <div
                  onClick={() => toggleExpand(arch.id)}
                  className="flex cursor-pointer items-center justify-between bg-slate-50/50 p-5 hover:bg-slate-100/50 dark:bg-slate-900/50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        {arch.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />{" "}
                          {new Date(arch.created_at).toLocaleDateString(
                            "id-ID",
                            { dateStyle: "full" }
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <User size={12} /> Closed by:{" "}
                          <span className="font-medium">{arch.closed_by}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">
                        Total Selesai
                      </p>
                      <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
                        {arch.total_done}{" "}
                        <span className="text-sm font-normal text-slate-400">
                          Tugas
                        </span>
                      </p>
                    </div>
                    {expandedId === arch.id ? (
                      <ChevronUp size={20} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={20} className="text-slate-400" />
                    )}
                  </div>
                </div>

                {/* DETAILS (Muncul kalau diklik) */}
                {expandedId === arch.id && (
                  <div className="border-t border-slate-100 p-5 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Detail Tugas Selesai:
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {tasksData.map((t: Task) => (
                        <div
                          key={t.id}
                          className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 hover:border-indigo-100 dark:border-slate-800 dark:hover:border-slate-700 transition-colors"
                        >
                          <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500 shrink-0 shadow-sm shadow-emerald-200 dark:shadow-none" />
                          <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                              {t.title}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                {t.division}
                              </span>
                              <span>PIC: {t.pic}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


