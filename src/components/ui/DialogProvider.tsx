// src/components/ui/DialogProvider.tsx
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Info,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- UPDATE: Menambahkan tipe 'warning' dan 'success' ---
type DialogTone = "default" | "danger" | "warning" | "success";

type BaseDialogOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: DialogTone;
};

type PromptDialogOptions = BaseDialogOptions & {
  inputLabel?: string;
  inputPlaceholder?: string;
  defaultValue?: string;
};

type DialogKind = "alert" | "confirm" | "prompt";

type DialogState = {
  kind: DialogKind;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  tone: DialogTone;
  inputLabel?: string;
  inputPlaceholder?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

type DialogContextValue = {
  alert: (options: BaseDialogOptions) => Promise<void>;
  confirm: (options: BaseDialogOptions) => Promise<boolean>;
  prompt: (options: PromptDialogOptions) => Promise<string | null>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

// --- UPDATE: Definisi Style untuk semua warna ---
const TONE_STYLES = {
  default: {
    icon: Info,
    iconBg:
      "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
    bar: "from-indigo-500/50 via-indigo-500/20 to-transparent",
    button: "bg-indigo-600 hover:bg-indigo-700",
    ring: "shadow-[0_0_24px_rgba(79,70,229,0.15)]",
  },
  danger: {
    icon: AlertTriangle,
    iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
    bar: "from-rose-500/60 via-rose-500/20 to-transparent",
    button: "bg-rose-600 hover:bg-rose-700",
    ring: "shadow-[0_0_24px_rgba(225,29,72,0.16)]",
  },
  warning: {
    icon: AlertCircle,
    iconBg:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
    bar: "from-amber-500/60 via-amber-500/20 to-transparent",
    button: "bg-amber-600 hover:bg-amber-700",
    ring: "shadow-[0_0_24px_rgba(245,158,11,0.16)]",
  },
  success: {
    icon: CheckCircle2,
    iconBg:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    bar: "from-emerald-500/60 via-emerald-500/20 to-transparent",
    button: "bg-emerald-600 hover:bg-emerald-700",
    ring: "shadow-[0_0_24px_rgba(16,185,129,0.16)]",
  },
};

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error("useDialog must be used within DialogProvider");
  }
  return ctx;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef("");
  const titleId = useId();
  const messageId = useId();

  const closeDialog = useCallback(() => {
    setDialog(null);
  }, []);

  const alert = useCallback(
    (options: BaseDialogOptions) =>
      new Promise<void>((resolve) => {
        setDialog({
          kind: "alert",
          title: options.title,
          message: options.message,
          confirmText: options.confirmText || "OK",
          cancelText: options.cancelText,
          tone: options.tone || "default",
          onConfirm: () => {
            resolve();
            closeDialog();
          },
          onCancel: () => {
            resolve();
            closeDialog();
          },
        });
      }),
    [closeDialog],
  );

  const confirm = useCallback(
    (options: BaseDialogOptions) =>
      new Promise<boolean>((resolve) => {
        setDialog({
          kind: "confirm",
          title: options.title,
          message: options.message,
          confirmText: options.confirmText || "Ya",
          cancelText: options.cancelText || "Batal",
          tone: options.tone || "default",
          onConfirm: () => {
            resolve(true);
            closeDialog();
          },
          onCancel: () => {
            resolve(false);
            closeDialog();
          },
        });
      }),
    [closeDialog],
  );

  const prompt = useCallback(
    (options: PromptDialogOptions) =>
      new Promise<string | null>((resolve) => {
        inputRef.current = options.defaultValue || "";
        setInputValue(inputRef.current);
        setDialog({
          kind: "prompt",
          title: options.title,
          message: options.message,
          confirmText: options.confirmText || "Simpan",
          cancelText: options.cancelText || "Batal",
          tone: options.tone || "default",
          inputLabel: options.inputLabel,
          inputPlaceholder: options.inputPlaceholder,
          onConfirm: () => {
            const nextValue = inputRef.current.trim();
            resolve(nextValue.length > 0 ? nextValue : null);
            closeDialog();
          },
          onCancel: () => {
            resolve(null);
            closeDialog();
          },
        });
      }),
    [closeDialog],
  );

  const contextValue = useMemo(
    () => ({ alert, confirm, prompt }),
    [alert, confirm, prompt],
  );

  useEffect(() => {
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dialog.onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialog]);

  const toneStyles = dialog ? TONE_STYLES[dialog.tone] : TONE_STYLES.default;
  const ToneIcon = dialog ? toneStyles.icon : Info;

  return (
    <DialogContext.Provider value={contextValue}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) dialog.onCancel();
          }}
        >
          <div
            className={cn(
              "relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900",
              toneStyles.ring,
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={messageId}
          >
            <div
              className={cn("h-1 w-full bg-gradient-to-r", toneStyles.bar)}
            />
            <button
              onClick={dialog.onCancel}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>

            <div className="flex gap-4 px-6 py-6">
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl",
                  toneStyles.iconBg,
                )}
              >
                <ToneIcon size={20} />
              </div>
              <div className="flex-1">
                <h2
                  id={titleId}
                  className="text-base font-semibold text-slate-900 dark:text-slate-100"
                >
                  {dialog.title}
                </h2>
                <p
                  id={messageId}
                  className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line"
                >
                  {dialog.message}
                </p>
                {dialog.kind === "prompt" && (
                  <div className="mt-4 space-y-2">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {dialog.inputLabel || "Input"}
                    </label>
                    <input
                      autoFocus
                      value={inputValue}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        inputRef.current = nextValue;
                        setInputValue(nextValue);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") dialog.onConfirm();
                      }}
                      placeholder={dialog.inputPlaceholder}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
              {dialog.kind !== "alert" && (
                <button
                  onClick={dialog.onCancel}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  {dialog.cancelText}
                </button>
              )}
              <button
                onClick={dialog.onConfirm}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm",
                  toneStyles.button,
                )}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
