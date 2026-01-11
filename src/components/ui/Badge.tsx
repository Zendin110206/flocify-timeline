// src/components/ui/Badge.tsx
import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "danger" | "success" | "warning";
}

export function Badge({
  children,
  className,
  variant = "default",
}: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    danger: "bg-rose-100 text-rose-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-black/5",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}


