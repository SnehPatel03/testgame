"use client";

import { cn } from "@/lib/utils";

/**
 * Spinner — minimal inline spinner (thin crimson ring).
 * Sized 16/20/24. Use inside buttons or inline with text.
 */
export function Spinner({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-block align-middle", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className="spin"
        fill="none"
        stroke="currentColor"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" stroke="rgba(198, 40, 40, 0.25)" strokeWidth="2" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="#FF5252"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
