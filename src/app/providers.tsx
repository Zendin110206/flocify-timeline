// src/app/providers.tsx
"use client";

import { ThemeProvider } from "next-themes";
import * as React from "react";
import { DialogProvider } from "@/components/ui/DialogProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <DialogProvider>{children}</DialogProvider>
    </ThemeProvider>
  );
}


