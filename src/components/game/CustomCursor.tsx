"use client";

import { useEffect, useRef, useState } from "react";

/**
 * CustomCursor — desktop only.
 *
 * A small crimson dot at the exact pointer position, plus a thin trailing
 * ring that follows with smooth easing. The ring:
 *   - expands softly over links / buttons / .cursor-hover elements
 *   - shrinks on click
 *   - becomes a subtle "view" state over .cursor-view elements (images/cards)
 *   - hides entirely on touch devices (we don't even mount it)
 *   - is disabled when prefers-reduced-motion is set
 *
 * Implementation notes:
 *   - We animate transform/opacity only, for 60fps.
 *   - The ring uses requestAnimationFrame lerp toward the dot.
 *   - The body gets `has-custom-cursor` so the CSS hides the native cursor.
 */
function useIsDesktopFinePointer() {
  // Compute once on mount; matchMedia doesn't change mid-session for pointer type.
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Defer the state update to avoid a synchronous setState-in-effect lint.
    if (fine && !reduce) {
      const id = setTimeout(() => setEnabled(true), 0);
      return () => clearTimeout(id);
    }
  }, []);
  return enabled;
}

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const enabled = useIsDesktopFinePointer();

  useEffect(() => {
    if (!enabled) return;
    document.body.classList.add("has-custom-cursor");

    const dot = dotRef.current!;
    const ring = ringRef.current!;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const isInteractive = !!el.closest(
        'a, button, [role="button"], input, textarea, [data-cursor="hover"], .cursor-hover'
      );
      const isView = !!el.closest('[data-cursor="view"], .cursor-view');
      ring.classList.toggle("is-hover", isInteractive && !isView);
      ring.classList.toggle("is-view", isView);
    };
    const onDown = () => ring.classList.add("is-pressed");
    const onUp = () => ring.classList.remove("is-pressed");
    const onLeave = () => {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };
    const onEnter = () => {
      dot.style.opacity = "1";
      ring.style.opacity = "1";
    };

    const tick = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      document.body.classList.remove("has-custom-cursor");
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden />
      <div ref={dotRef} className="cursor-dot" aria-hidden />
    </>
  );
}
