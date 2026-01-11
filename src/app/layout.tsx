// src/app/layout.tsx
import type { Metadata } from "next";
import { Providers } from "./providers"; // Import provider yg baru dibuat
import "./globals.css";

export const metadata: Metadata = {
  title: "Flocify Timeline",
  description: "Task Management for ShopFish Team",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      {/* HAPUS class warna bg-slate disini, biar diurus sama globals.css */}
      <body className="antialiased text-slate-900 dark:text-slate-100 transition-colors duration-300" suppressHydrationWarning={true}>
        
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


