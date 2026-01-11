// src/components/features/TaskFilters.tsx
import React from "react";
import { Search } from "lucide-react";
import { DIVISIONS } from "@/lib/data";
import { Division } from "@/lib/types";

interface TaskFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  division: Division | "all";
  onDivisionChange: (val: Division | "all") => void;
}

export function TaskFilters({
  search,
  onSearchChange,
  division,
  onDivisionChange,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari tugas atau nama PIC..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
        />
      </div>
      <select
        value={division}
        onChange={(e) => onDivisionChange(e.target.value as Division | "all")}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
      >
        <option value="all">Semua Divisi</option>
        {DIVISIONS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  );
}


