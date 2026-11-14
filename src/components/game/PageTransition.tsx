"use client";

import type { ReactNode } from "react";

/**
 * Lightweight route transition shared by game screens.
 */
export function PageTransition({
  children,
  className = "",
  keyId,
}: {
  children: ReactNode;
  className?: string;
  keyId?: string;
}) {
  return (
    <div
      key={keyId}
      className={`screen-enter ${className}`}
    >
      {children}
    </div>
  );
}

/** A small delayed entrance for screen content. */
export function FadeItem({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div className={`screen-enter ${className}`} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}
