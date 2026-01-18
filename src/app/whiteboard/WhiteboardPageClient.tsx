// src/app/whiteboard/WhiteboardPageClient.tsx
"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Monitor } from "lucide-react";

const WhiteboardCanvas = dynamic(
  () => import("@/components/features/WhiteboardCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-3xl border border-slate-200 bg-white/90 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
        Memuat whiteboard...
      </div>
    ),
  },
);

export default function WhiteboardPageClient() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen flex-col md:hidden">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Monitor size={24} />
          </div>
          <h1 className="text-lg font-bold">Whiteboard hanya untuk desktop</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Buka halaman ini di layar laptop atau monitor agar canvas dan tools
            tampil optimal.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <ArrowLeft size={16} /> Kembali ke Dashboard
          </Link>
        </div>
      </div>

      <div className="hidden min-h-screen flex-col md:flex">
        <header className="border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <ArrowLeft size={18} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Whiteboard Studio
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Ruang sketsa cepat untuk ide tim, flow, dan diskusi visual.
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 lg:flex">
              <Monitor size={14} /> Desktop Mode
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6">
          <div className="mx-auto h-[calc(100vh-160px)] max-w-7xl">
            <WhiteboardCanvas className="h-full" />
          </div>
        </main>
      </div>
    </div>
  );
}
