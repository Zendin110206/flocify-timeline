import { Suspense } from "react";
import FinancePageClient from "./FinancePageClient";

export default function FinancePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500 dark:border-slate-800 dark:border-t-indigo-400"></div>
            <span className="text-sm font-medium">Memuat Finance...</span>
          </div>
        </div>
      }
    >
      <FinancePageClient />
    </Suspense>
  );
}
