"use client";

import { toast as sonnerToast } from "sonner";

type ToastInput = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
};

export function toast({ title, description, variant, duration }: ToastInput) {
  if (variant === "destructive") {
    sonnerToast.error(title ?? "SYSTEM COMPLIANCE WARNING", {
      description,
      duration: duration ?? 14000,
    });
    return;
  }
  sonnerToast(title ?? "Notice", { description, duration: duration ?? 4000 });
}

export function useToast() {
  return { toast };
}
