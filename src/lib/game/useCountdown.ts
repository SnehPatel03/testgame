"use client";

import { useEffect, useRef, useState } from "react";
import { NIGHT_DURATION_MS } from "@/lib/game/protocol";

/// A synchronized countdown driven by a server-provided endsAt timestamp.
/// Returns the remaining milliseconds (0..N), floored to a centisecond.
/// The hook recomputes from the absolute deadline each tick so timers
/// stay synchronized across phones.
export function useCountdown(endsAt?: number) {
  const [remainingMs, setRemainingMs] = useState(0);
  const lastEndsAt = useRef<number | undefined>(endsAt);

  useEffect(() => {
    lastEndsAt.current = endsAt;
    if (!endsAt) {
      // Don't call setState synchronously — defer it inside the next tick.
      const id = setTimeout(() => setRemainingMs(0), 0);
      return () => clearTimeout(id);
    }
    const tick = () => {
      const e = lastEndsAt.current;
      if (!e) return;
      const r = Math.max(0, e - Date.now());
      setRemainingMs(r);
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [endsAt]);

  return {
    remainingMs,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    progress: endsAt ? Math.min(1, Math.max(0, 1 - remainingMs / NIGHT_DURATION_MS)) : 0,
  };
}
