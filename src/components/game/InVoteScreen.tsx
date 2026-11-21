"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Vote } from "lucide-react";
import { FadeItem } from "@/components/game/PageTransition";
import { useGame, useActions } from "@/lib/game/store";
import { EliminationNotice } from "@/components/game/EliminationNotice";
import { useCountdown } from "@/lib/game/useCountdown";

export function InVoteScreen() {
  const state = useGame((s) => s.state)!;
  const actions = useActions();
  const [selected, setSelected] = useState<string | null>(null);
  const voted = state.meHasVoted ?? false;
  const { remainingSeconds } = useCountdown(state.room.voteEndsAt);

  return (
    <div className="min-h-screen flex flex-col px-5 py-8 max-w-md mx-auto">
      <FadeItem delay={0.05} className="text-center mb-6">
        <p className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground/80 mb-2">Remote vote · Round {state.room.round}</p>
        <h1 className="text-2xl font-medium text-balance">Who should be voted out?</h1>
        <p className="text-sm text-muted-foreground mt-2">Votes stay private. The highest vote eliminates that player.</p>
        <p className="text-xs text-muted-foreground mt-2">{remainingSeconds}s left · {state.room.votedCount} votes received</p>
      </FadeItem>
      <EliminationNotice message={state.room.morningMessage} />
      <div className="flex-1 space-y-2">
        {state.room.players.filter((p) => p.alive && p.id !== state.me.id && state.me.alive).map((p) => {
          const active = selected === p.id;
          return <motion.button key={p.id} whileTap={{ scale: 0.985 }} disabled={!state.me.alive || remainingSeconds <= 0} onClick={() => { setSelected(p.id); actions.submitPlayerVote(p.id); }} className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3 ${active ? "border-red-500/60 bg-red-500/10" : "border-border/50 bg-muted/15"}`}>
            <span className="flex-1 font-medium">{p.name}</span>
            {!p.connected && <span className="text-xs text-muted-foreground">away</span>}
            {!p.connected && <span className="text-xs text-muted-foreground">away</span>}
            {active && <Check className="w-4 h-4 text-red-400" />}
          </motion.button>;
        })}
      </div>
      <FadeItem delay={0.2} className="mt-6 text-center text-xs text-muted-foreground">
        <Vote className="inline w-4 h-4 mr-1" />
        {!state.me.alive ? "You are out and cannot vote." : voted ? "Your vote is recorded." : "Choose one living player. You can change your vote until everyone has voted."}
      </FadeItem>
    </div>
  );
}
