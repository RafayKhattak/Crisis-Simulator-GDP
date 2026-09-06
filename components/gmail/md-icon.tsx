"use client";

import { cn } from "@/lib/utils";

type MdIconProps = {
  name: string;
  filled?: boolean;
  size?: number;
  className?: string;
  wght?: number;
};

export function MdIcon({
  name,
  filled = false,
  size = 20,
  className,
  wght = 400,
}: MdIconProps) {
  return (
    <span
      className={cn("gmail-md", className)}
      style={{
        fontSize: size,
        width: size,
        height: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${wght}, 'GRAD' 0, 'opsz' ${Math.min(48, Math.max(20, size))}`,
      }}
      aria-hidden
    >
      {name}
    </span>
  );
}
