// src/components/layout/Navbar.tsx
import React, { useEffect, useState } from "react";
import {
  Plus,
  Moon,
  Sun,
  LogOut,
  User,
  Bell,
  Check,
  Trash2,
  RefreshCcw,
  Archive,
  FileText,
  ArrowUpRight,
  Wallet,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ADMINS } from "@/lib/data";
import { AppNotification } from "@/lib/types";

interface NavbarProps {
  currentUser: string;
  notifications: AppNotification[];
  onLogout: () => void;
  onAddTask: () => void;
  onMarkRead: (id: string) => void;
  onClearNotifs: () => void;
  onSimulateNewDay: () => void;
  onCloseSprint: () => void;
}

export function Navbar({
  currentUser,
  notifications,
  onLogout,
  onAddTask,
  onMarkRead,
  onClearNotifs,
  onSimulateNewDay,
  onCloseSprint,
}: NavbarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const myNotifs = notifications.filter(
    (n) => n.userId === currentUser || n.userId === "All",
  );
  const unreadCount = myNotifs.filter((n) => !n.isRead).length;

  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleNotificationClick = (notif: AppNotification) => {
    onMarkRead(notif.id);
    setShowNotifDropdown(false);
    if (notif.relatedFinanceId) {
      router.push(`/finance?tx=${notif.relatedFinanceId}`);
      return;
    }
    if (notif.relatedTaskId) {
      router.push(`/task/${notif.relatedTaskId}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* LOGO */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-200 dark:shadow-none">
            F
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none text-slate-900 dark:text-white">
              Flocify
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Command Center
            </p>
          </div>
        </div>

        {/* KANAN */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/finance"
            title="Keuangan"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Wallet size={20} />
          </Link>

          <Link
            href="/report"
            title="Lihat Laporan"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <FileText size={20} />
          </Link>

          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="hidden sm:block rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {mounted ? (
              isDark ? (
                <Sun size={20} />
              ) : (
                <Moon size={20} />
              )
            ) : (
              <div className="w-5 h-5" />
            )}
          </button>

          {/* NOTIFIKASI */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </button>
            {showNotifDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifDropdown(false)}
                />
                <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Notifikasi ({unreadCount})
                    </h3>
                    {myNotifs.length > 0 && (
                      <button
                        onClick={onClearNotifs}
                        className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Clear Saya
                      </button>
                    )}
                  </div>
                  <div className="max-h-75 overflow-y-auto">
                    {myNotifs.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        Kosong.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {myNotifs.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => handleNotificationClick(n)}
                            className={`flex w-full cursor-pointer gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                              !n.isRead
                                ? "bg-indigo-50/40 dark:bg-indigo-900/10"
                                : ""
                            }`}
                          >
                            <div
                              className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                                n.type === "danger"
                                  ? "bg-rose-500"
                                  : n.type === "warning"
                                    ? "bg-amber-500"
                                    : "bg-indigo-500"
                              }`}
                            />
                            <div className="flex-1">
                              <p className="text-sm leading-snug">
                                {n.message}
                              </p>
                              <p className="mt-1 text-[10px] text-slate-400">
                                {new Date(n.timestamp).toLocaleString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  day: "numeric",
                                  month: "short",
                                })}
                              </p>
                            </div>
                            <div className="flex items-start gap-2">
                              {!n.isRead && (
                                <Check
                                  size={14}
                                  className="text-indigo-500 mt-1"
                                />
                              )}
                              {(n.relatedTaskId || n.relatedFinanceId) && (
                                <ArrowUpRight
                                  size={14}
                                  className="mt-1 text-slate-400"
                                />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <User size={16} /> {currentUser}
          </div>

          <button
            onClick={onAddTask}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Baru</span>
          </button>

          {/* ADMIN TOOLS (Hanya muncul untuk Trio Maut) */}
          {ADMINS.includes(currentUser) && (
            <>
              <button
                onClick={onSimulateNewDay}
                title="Reset Data (Debug)"
                className="rounded-lg border border-indigo-200 bg-indigo-50 p-2 text-indigo-600 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400"
              >
                <RefreshCcw size={20} />
              </button>
              <button
                onClick={onCloseSprint}
                title="Tutup Buku Mingguan"
                className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                <Archive size={20} />
              </button>
            </>
          )}

          <button
            onClick={onLogout}
            title="Keluar"
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:hover:bg-rose-900/20"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
