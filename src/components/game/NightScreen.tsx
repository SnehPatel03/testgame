"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Eye } from "lucide-react";
import { useGame, useActions } from "@/lib/game/store";
import { useCountdown } from "@/lib/game/useCountdown";
import { FadeItem } from "@/components/game/PageTransition";

const EASE = [0.22, 1, 0.36, 1] as const;

export function NightScreen() {
  const state = useGame((s) => s.state);
  if (!state) return null;
  if (!state.me.alive) return <SpectatorNight />;
  return <ActiveNight />;
}

function ActiveNight() {
  const state = useGame((s) => s.state)!;
  const actions = useActions();
  const task = state.nightTask;
  const { remainingSeconds, progress } = useCountdown(state.room.nightEndsAt);
  const [sel, setSel] = useState<{ qid: string; idx: number } | null>(null);
  const selected = sel && sel.qid === task?.questionId ? sel.idx : null;

  if (!task) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-sm text-muted-foreground">Night in progress…</p>
      </div>
    );
  }

  const isQuiz = task.kind === "quiz";
  const isSelect = task.kind === "select";

  const onSelect = (idx: number) => {
    if (remainingSeconds <= 0) return;
    if (task) setSel({ qid: task.questionId, idx });
    if (isQuiz) {
      actions.submitQuizAnswer(idx);
    } else if (isSelect) {
      const pid = task.optionPlayerIds[idx];
      if (pid) actions.selectNightTarget(pid);
    }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden flex flex-col">
      {/* Top bar */}
      <FadeItem delay={0.05} className="px-5 pt-6 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Moon className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-[0.3em]">
              Night · Round {state.room.round}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[#FF5252]/80">
            <Eye className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-[0.25em]">Private</span>
          </div>
        </div>
        <CountdownRing seconds={remainingSeconds} progress={progress} />
      </FadeItem>

      {/* Body */}
      <div className="flex-1 px-5 pb-8 flex flex-col max-w-md mx-auto w-full">
        <FadeItem delay={0.12}>
          <div className="surface rounded-2xl p-5 mb-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/80 mb-2">
              Question {state.room.round}
            </p>
            <h2 className="text-base font-medium leading-snug text-balance">
              {task.question}
            </h2>
          </div>
        </FadeItem>

        <div className="flex-1 space-y-2.5">
          {task.options.map((opt, idx) => {
            const isSelected = selected === idx;
            return (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(idx)}
                disabled={remainingSeconds <= 0}
                className={`w-full text-left p-4 rounded-2xl border flex items-center gap-3 transition-all duration-[220ms] ${
                  isSelected
                    ? "border-[rgba(198,40,40,0.65)] bg-[rgba(198,40,40,0.15)] shadow-[0_0_32px_-8px_rgba(198,40,40,0.55)]"
                    : "border-border/50 bg-muted/15 hover:bg-muted/25 hover:border-[rgba(198,40,40,0.45)]"
                } ${remainingSeconds <= 0 ? "opacity-50" : ""}`}
                style={{ transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)" }}
                data-cursor="hover"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors duration-[220ms] ${
                    isSelected
                      ? "bg-[rgba(198,40,40,0.4)] text-white"
                      : "bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="flex-1 text-sm font-medium">{opt}</span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {remainingSeconds <= 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 text-center text-sm text-muted-foreground"
            >
              Time&apos;s up. Resolving the night…
            </motion.p>
          )}
        </AnimatePresence>

        {selected !== null && remainingSeconds > 0 && (
          <p className="mt-4 text-center text-[11px] text-muted-foreground/65">
            {isQuiz
              ? "Selection saved. You can change it before time runs out."
              : "Target selected. You can change it before time runs out."}
          </p>
        )}
      </div>
    </div>
  );
}

function SpectatorNight() {
  const state = useGame((s) => s.state)!;
  const { remainingSeconds } = useCountdown(state.room.nightEndsAt);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <FadeItem delay={0.1}>
        <div className="text-center">
          <Moon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4 soft-pulse" />
          <h2 className="text-xl font-medium mb-2">Night in progress</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            You&apos;re a spectator. The night ends for everyone in {remainingSeconds}s.
          </p>
        </div>
      </FadeItem>
    </div>
  );
}

function CountdownRing({ seconds, progress }: { seconds: number; progress: number }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const off = C * (1 - progress);
  const danger = seconds <= 5;
  return (
    <div className="flex flex-col items-center my-2">
      <div className="relative w-32 h-32">
        <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
          <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(36,16,18,0.6)" strokeWidth="4" />
          <circle
            cx="64"
            cy="64"
            r={R}
            fill="none"
            stroke={danger ? "#FF5252" : "#C62828"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={off}
            style={{
              transition: "stroke-dashoffset 100ms linear",
              filter: `drop-shadow(0 0 12px ${danger ? "rgba(255,82,82,0.6)" : "rgba(198,40,40,0.5)"})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className={`text-4xl font-semibold tabular-nums ${
              danger ? "text-[#FF5252]" : "text-foreground"
            }`}
          >
            {seconds}
          </div>
          <div className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground mt-0.5">
            seconds
          </div>
        </div>
      </div>
    </div>
  );
}
