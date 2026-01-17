// src/components/layout/TabNavigation.tsx
import React from "react";
import { Tab } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TabNavigationProps {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
  overdueCount: number;
  requestCount?: number;
  showRequests?: boolean;
}

export function TabNavigation({
  activeTab,
  onChange,
  overdueCount,
  requestCount = 0,
  showRequests = false,
}: TabNavigationProps) {
  const tabs: { id: Tab; label: string; icon?: React.ElementType }[] = [
    { id: "my", label: "My Tasks" },
    { id: "timeline", label: "Timeline" },
    { id: "calendar", label: "Calendar" },
    { id: "all", label: "All Tasks" },
    {
      id: "overdue",
      label: `Overdue ${overdueCount > 0 ? `(${overdueCount})` : ""}`,
    },
  ];
  if (showRequests) {
    tabs.push({
      id: "requests",
      label: `Requests ${requestCount > 0 ? `(${requestCount})` : ""}`,
    });
  }
  tabs.push({ id: "performance", label: "Performance" });

  return (
    <div className="border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 transition-colors">
      <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200",
              tab.id === "overdue" &&
                overdueCount > 0 &&
                "text-rose-600 dark:text-rose-400",
              tab.id === "requests" &&
                requestCount > 0 &&
                "text-amber-600 dark:text-amber-400"
            )}
          >
            {tab.icon && <tab.icon size={14} />}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

