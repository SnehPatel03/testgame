"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Hand, Users, CheckCheck } from "lucide-react";
import { FadeItem } from "@/components/game/PageTransition";
import { useGame, useActions } from "@/lib/game/store";
import { EliminationNotice } from "@/components/game/EliminationNotice";
import { toast } from "sonner";

const EASE = [0.22, 1, 0.36, 1] as const;

export function InVoteScreen() {
  const state = useGame((s) => s.state)!;
  const actions = useActions();
  const me = state.me;
  const readyCount = state.room.readyCount ?? 0;
  const needed = state.room.neededReadyCount ?? 0;

  return (
    <div className="min-h-screen flex flex-col px-5 py-8 max-w-md mx-auto">
      <FadeItem delay={0.05} className="text-center mb-6">
        <p className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground/80 mb-2">
          In-Person Voting
        </p>
        <h1 className="text-2xl font-medium text-balance">Discuss and vote in person</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto text-pretty">
          Whoever the group eliminates physically should tap “I&apos;m out” on their phone.
        </p>
      </FadeItem>

      <EliminationNotice message={state.room.morningMessage} />

      {/* Readiness */}
      <FadeItem delay={0.12}>
        <div className="surface rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-sm font-medium flex items-center gap-2">
              <CheckCheck className="w-4 h-4 text-[#C62828]" />
              Everyone ready
            </span>
            <span className="text-sm font-mono text-muted-foreground">
              {readyCount} / {needed}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#C62828] to-[#FF5252]"
              initial={{ width: 0 }}
              animate={{ width: `${needed ? (readyCount / needed) * 100 : 0}%` }}
              transition={{ duration: 0.42, ease: EASE }}
              style={{ boxShadow: "0 0 12px rgba(198,40,40,0.5)" }}
            />
          </div>
        </div>
      </FadeItem>

      {/* Player list */}
      <FadeItem delay={0.18} className="flex-1 max-h-72 overflow-y-auto thin-scroll space-y-1.5">
        {state.room.players.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/15 border border-border/30"
          >
            <div className="w-7 h-7 rounded-full bg-[rgba(198,40,40,0.18)] flex items-center justify-center text-[#FF5252] text-[10px] font-bold uppercase">
              {p.name.slice(0, 2)}
            </div>
            <span className="flex-1 text-sm font-medium">{p.name}</span>
            {!p.connected && (
              <span className="text-[10px] text-muted-foreground/55 uppercase tracking-wide">away</span>
            )}
            {p.ready && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.32, ease: EASE }}
                className="text-[10px] text-[#FF5252] uppercase font-bold tracking-wide"
              >
                ready
              </motion.span>
            )}
          </div>
        ))}
      </FadeItem>

      <FadeItem delay={0.24} className="mt-6 space-y-2.5">
        {me.alive ? (
          <>
            <Button
              onClick={() => {
                actions.markPlayerOut();
                toast("You have been marked out", {
                  description: "Only the host can undo this.",
                });
              }}
              variant="destructive"
              className="w-full h-14 text-base font-semibold rounded-2xl bg-[rgba(198,40,40,0.22)] hover:bg-[rgba(198,40,40,0.35)] border border-[rgba(198,40,40,0.55)] hover:shadow-[0_0_36px_-8px_rgba(255,82,82,0.55)] active:scale-[0.985]"
              data-cursor="hover"
            >
              <Hand className="w-4 h-4 mr-2" />
              I&apos;m out
            </Button>
            <Button
              onClick={() => actions.toggleReady()}
              variant={me.ready ? "default" : "outline"}
              className={`w-full h-12 text-sm font-semibold rounded-2xl transition-all duration-[220ms] ${
                me.ready
                  ? "bg-[rgba(198,40,40,0.25)] border border-[rgba(255,82,82,0.7)] text-foreground"
                  : "border-border/60 bg-muted/25 hover:bg-muted/40"
              }`}
              data-cursor="hover"
              style={{ transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)" }}
            >
              <Users className="w-3.5 h-3.5 mr-2" />
              {me.ready ? "Ready!" : "I'm ready"}
            </Button>
          </>
        ) : (
          <div className="w-full text-center py-4 rounded-2xl bg-muted/20 text-sm text-muted-foreground border border-border/40">
            You&apos;re out — no need to ready up.
          </div>
        )}

        {me.isHost && (
          <p className="text-[10px] text-muted-foreground/55 text-center pt-2 leading-relaxed">
            As host, you can undo an incorrect elimination by tapping a player and
            selecting “Undo”. (Uses the
            <code className="px-1 mx-1 bg-muted/40 rounded text-[10px]">undoPlayerOut</code> event.)
          </p>
        )}
      </FadeItem>
    </div>
  );
}
