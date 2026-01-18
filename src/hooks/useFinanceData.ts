// src/hooks/useFinanceData.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Transaction } from "@/lib/types";
import {
  getBaseAmount,
  getOutflowAmount,
  shouldAffectBalance,
} from "@/lib/finance";

type AmountInput = number | string | null | undefined;
type TransactionRow = Omit<
  Transaction,
  "amount_requested" | "amount_realized" | "amount_returned" | "attachments"
> & {
  amount_requested: AmountInput;
  amount_realized?: AmountInput;
  amount_returned?: AmountInput;
  attachments?: string[] | null;
};

const parseAmount = (value: AmountInput) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const parseNullableAmount = (value: AmountInput) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeTransaction = (t: TransactionRow): Transaction => ({
  ...t,
  amount_requested: parseAmount(t.amount_requested),
  amount_realized: parseNullableAmount(t.amount_realized),
  amount_returned: parseNullableAmount(t.amount_returned),
  attachments: Array.isArray(t.attachments)
    ? t.attachments.filter((item): item is string => typeof item === "string")
    : [],
});

const sortByDateDesc = (list: Transaction[]) =>
  [...list].sort((a, b) => b.date.localeCompare(a.date));

export function useFinanceData() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState(0);

  // --- 1. HITUNG SALDO OTOMATIS ---
  const calculateBalance = (data: Transaction[]) => {
    let currentBalance = 0;

    data.forEach((t) => {
      if (!shouldAffectBalance(t)) return;
      if (t.type === "income") {
        currentBalance += getBaseAmount(t);
        return;
      }
      currentBalance -= getOutflowAmount(t);
    });

    setBalance(currentBalance);
  };

  // --- 2. FETCH DATA ---
  const fetchFinance = useCallback(async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false }); // Urutkan dari yang terbaru

    if (error) {
      console.error("Error fetching finance:", error);
    } else if (data) {
      // Mapping data dari DB ke Tipe TypeScript kita
      const mappedData: Transaction[] = sortByDateDesc(
        data.map((t) => normalizeTransaction(t as TransactionRow)),
      );

      setTransactions(mappedData);
      calculateBalance(mappedData);
    }

    setIsLoading(false);
  }, []);

  // --- 3. REALTIME SUBSCRIPTION ---
  useEffect(() => {
    // Load awal
    setTimeout(() => {
      fetchFinance();
    }, 0);

    // Dengerin perubahan di tabel transactions
    const channel = supabase
      .channel("realtime-finance")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        (payload) => {
          console.log("💰 Realtime: Ada transaksi baru/update!");
          const event = payload?.eventType;
          if (!event) {
            fetchFinance();
            return;
          }

          setTransactions((prev) => {
            let next = prev;

            if (event === "INSERT" && payload.new) {
              const incoming = normalizeTransaction(
                payload.new as Transaction,
              );
              next = [incoming, ...prev.filter((t) => t.id !== incoming.id)];
            } else if (event === "UPDATE" && payload.new) {
              const incoming = normalizeTransaction(
                payload.new as Transaction,
              );
              const exists = prev.some((t) => t.id === incoming.id);
              next = exists
                ? prev.map((t) => (t.id === incoming.id ? incoming : t))
                : [incoming, ...prev];
            } else if (event === "DELETE" && payload.old) {
              const removedId = (payload.old as Transaction).id;
              next = prev.filter((t) => t.id !== removedId);
            } else {
              fetchFinance();
              return prev;
            }

            const sorted = sortByDateDesc(next);
            calculateBalance(sorted);
            return sorted;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFinance]);

  return {
    transactions,
    balance,
    isLoading,
    refreshFinance: fetchFinance,
  };
}
