"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ShieldCheck, Skull, ChevronRight } from "lucide-react";
import { FadeItem } from "@/components/game/PageTransition";
import { useActions, useGame } from "@/lib/game/store";

const EASE = [0.22, 1, 0.36, 1] as const;

export function RoleRevealScreen() {
  const role = useGame((s) => s.role);
  const actions = useActions();
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onBlur = () => setRevealed(false);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) setRevealed(false);
    });
    return () => window.removeEventListener("blur", onBlur);
  }, []);

  const holdStart = () => setRevealed(true);
  const holdEnd = () => setRevealed(false);
  const isMafia = role === "mafia";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 max-w-md mx-auto">
      <FadeItem delay={0.05}>
        <p className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground/80 mb-2">
          Private Role Reveal
        </p>
        <h2 className="text-lg font-medium mb-7 text-center text-balance">
          Hold the card to see your role
        </h2>
      </FadeItem>

      <FadeItem delay={0.15} className="w-full">
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div key="card" className="w-full">
              <div
                onPointerDown={holdStart}
                onPointerUp={holdEnd}
                onPointerLeave={holdEnd}
                onPointerCancel={holdEnd}
                className={`relative w-full aspect-[3/4] rounded-3xl border select-none touch-none transition-all duration-[400ms] ${
                  revealed
                    ? isMafia
                      ? "bg-gradient-to-br from-[#1A0809] via-[#241012] to-[#0A0506] border-[rgba(198,40,40,0.7)] shadow-[0_0_80px_-12px_rgba(198,40,40,0.55)]"
                      : "bg-gradient-to-br from-[#1A0809] via-[#241012] to-[#0A0506] border-[rgba(198,40,40,0.55)] shadow-[0_0_80px_-12px_rgba(198,40,40,0.45)]"
                    : "bg-[#1A0809] border-border/60 shadow-[0_12px_48px_-12px_rgba(0,0,0,0.7)]"
                }`}
                style={{ transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)" }}
                data-cursor="view"
              >
                <AnimatePresence mode="wait">
                  {revealed ? (
                    <motion.div
                      key="role"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.28, ease: EASE }}
                      className="absolute inset-0 flex flex-col items-center justify-center p-6"
                    >
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 bg-[rgba(198,40,40,0.18)] border border-[rgba(198,40,40,0.5)]">
                        {isMafia ? (
                          <Skull className="w-7 h-7 text-[#FF5252]" strokeWidth={2.2} />
                        ) : (
                          <ShieldCheck className="w-7 h-7 text-[#FF5252]" strokeWidth={2.2} />
                        )}
                      </div>
                      <p className="text-[10px] uppercase tracking-[0.4em] text-foreground/70 mb-2">
                        You are
                      </p>
                      <h1 className="text-4xl font-semibold mb-3 text-balance">
                        {isMafia ? "માફિયા" : "ગામવાસી"}
                      </h1>
                      <p className="text-xs text-foreground/65 px-6 text-center text-pretty">
                        {isMafia
                          ? "Eliminate villagers at night. No one knows your teammates."
                          : "Survive. Find the Mafia among you."}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40 mt-5">
                        Release to hide
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="hidden"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center p-6"
                    >
                      <div className="w-16 h-16 rounded-full bg-muted/30 border border-border/40 flex items-center justify-center mb-6 soft-pulse">
                        <EyeOff className="w-7 h-7 text-muted-foreground" strokeWidth={2} />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Tap and hold to reveal
                      </p>
                      <p className="text-[11px] text-muted-foreground/55 mt-2 px-8 text-center">
                        Make sure no one is looking over your shoulder.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </FadeItem>

      {!done && (
        <FadeItem delay={0.25} className="w-full">
          <Button
            onClick={() => {
              setDone(true);
              actions.roleRevealComplete();
            }}
            className="mt-7 w-full h-12 text-sm font-semibold rounded-xl border border-border/60 bg-muted/30 hover:bg-[rgba(198,40,40,0.15)] hover:border-[rgba(198,40,40,0.5)] transition-all duration-[220ms]"
            data-cursor="hover"
          >
            I&apos;ve seen my role
            <ChevronRight className="w-4 h-4 ml-1.5" />
          </Button>
        </FadeItem>
      )}

      {done && (
        <FadeItem delay={0.1} className="w-full text-center mt-7">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Eye className="w-3.5 h-3.5" />
            <p className="text-sm">Waiting for night to begin…</p>
          </div>
          <p className="text-[11px] text-muted-foreground/55 mt-2">
            Everyone will see the same screen for 15 seconds.
          </p>
        </FadeItem>
      )}
    </div>
  );
}
