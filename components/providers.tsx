"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
    >
      <TooltipProvider delay={200}>
        {children}
        <Toaster position="bottom-left" theme="light" richColors closeButton />
      </TooltipProvider>
    </ThemeProvider>
  );
}
