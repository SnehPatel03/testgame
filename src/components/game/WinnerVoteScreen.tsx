"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Users, Skull, Clock } from "lucide-react";
import { FadeItem } from "@/components/game/PageTransition";
import { useGame, useActions } from "@/lib/game/store";
import { EliminationNotice } from "@/components/game/EliminationNotice";
import { toast } from "sonner";
import type { WinnerOption } from "@/lib/game/protocol";

const EASE = [0.22, 1, 0.36, 1] as const;

const OPTIONS: Array<{
  value: WinnerOption;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    value: "villagers",
    label: "Villagers won",
    desc: "All Mafia have been eliminated.",
    icon: <Users className="w-6 h-6" />,
  },
  {
    value: "mafia",
    label: "Mafia won",
    desc: "The Mafia outnumber the villagers.",
    icon: <Skull className="w-6 h-6" />,
  },
  {
    value: "notYet",
    label: "Not yet",
    desc: "Discuss and vote in person.",
    icon: <Clock className="w-6 h-6" />,
  },
];

export function WinnerVoteScreen() {
  const state = useGame((s) => s.state)!;
  const actions = useActions();
  const [voted, setVoted] = useState<WinnerOption | null>(null);

  const votedCount = state.room.votedCount ?? 0;
  const total = state.room.totalVoters ?? 0;

  const cast = (option: WinnerOption) => {
    setVoted(option);
    actions.submitWinnerVote(option);
    toast.success("Vote cast");
  };

  return (
    <div className="min-h-screen flex flex-col px-5 py-10 max-w-md mx-auto">
      <FadeItem delay={0.05} className="mb-7 text-center">
        <p className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground/80 mb-2">
          Winner Vote
        </p>
        <h1 className="text-2xl font-medium text-balance">Who won this game?</h1>
        <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-muted/20 border border-border/40 text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C62828]" />
          <span className="text-foreground/85">{votedCount} / {total} voted</span>
        </div>
      </FadeItem>

      <EliminationNotice message={state.room.morningMessage} />

      <div className="space-y-2.5 flex-1">
        {OPTIONS.map((opt, i) => {
          const active = voted === opt.value;
          return (
            <FadeItem key={opt.value} delay={0.12 + i * 0.06}>
              <motion.button
                whileTap={{ scale: 0.985 }}
                onClick={() => cast(opt.value)}
                className={`w-full text-left p-4 rounded-2xl border flex items-center gap-4 transition-all duration-[220ms] ${
                  active
                    ? "border-[rgba(198,40,40,0.65)] bg-[rgba(198,40,40,0.12)] shadow-[0_0_36px_-10px_rgba(198,40,40,0.55)]"
                    : "border-border/50 bg-muted/15 hover:bg-muted/25 hover:border-[rgba(198,40,40,0.45)]"
                }`}
                style={{ transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)" }}
                data-cursor="hover"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-[220ms] ${
                    active
                      ? "bg-[rgba(198,40,40,0.22)] text-[#FF5252] border border-[rgba(198,40,40,0.5)]"
                      : "bg-muted/30 text-muted-foreground border border-border/40"
                  }`}
                >
                  {opt.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-medium">{opt.label}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </div>
                {active && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.32, ease: EASE }}
                    className="w-6 h-6 rounded-full bg-[rgba(198,40,40,0.4)] border border-[rgba(255,82,82,0.7)] flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </motion.div>
                )}
              </motion.button>
            </FadeItem>
          );
        })}
      </div>

      <FadeItem delay={0.4}>
        <p className="text-[11px] text-muted-foreground/60 text-center mt-7">
          You can change your vote until the result is decided.
          Individual votes are never shown.
        </p>
      </FadeItem>
    </div>
  );
}
