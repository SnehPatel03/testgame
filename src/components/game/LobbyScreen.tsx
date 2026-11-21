"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Users, LogOut, Play, Minus, Plus, Trophy } from "lucide-react";
import { useActions, useGame } from "@/lib/game/store";
import { FadeItem } from "@/components/game/PageTransition";
import { toast } from "sonner";

const EASE = [0.22, 1, 0.36, 1] as const;

export function LobbyScreen() {
  const state = useGame((s) => s.state);
  const actions = useActions();
  const [mafiaCount, setMafiaCount] = useState<number | undefined>(undefined);

  if (!state) return null;

  const room = state.room;
  const me = state.me;
  const isHost = me.isHost;
  const players = room.players;

  const effectiveMafia = mafiaCount ?? room.mafiaCount;
  const minMafia = 1;
  const maxMafia = Math.max(1, Math.floor(players.length / 2) - 1);
  const canStart = players.length >= 4 && effectiveMafia >= minMafia && effectiveMafia <= maxMafia;

  const adjustMafia = (delta: number) => {
    const next = Math.min(maxMafia, Math.max(minMafia, effectiveMafia + delta));
    setMafiaCount(next);
    actions.setMafiaCount(next);
  };

  return (
    <div className="min-h-screen flex flex-col px-5 py-8 max-w-md mx-auto">
      <FadeItem delay={0.05}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/80">
              Room Code
            </p>
            <div className="flex items-center gap-2 mt-1">
              <h1 className="text-3xl font-bold font-mono tracking-[0.18em] text-foreground">
                {room.code}
              </h1>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(room.code);
                  toast.success("Code copied");
                }}
                className="text-[10px] px-2.5 py-1 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:border-[rgba(198,40,40,0.5)] transition-all duration-[220ms]"
                data-cursor="hover"
              >
                Copy
              </button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => actions.leaveRoom()}
            aria-label="Leave room"
            className="text-muted-foreground hover:text-foreground hover:bg-[rgba(198,40,40,0.12)] rounded-lg"
            data-cursor="hover"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </FadeItem>

      {/* Players card */}
      <FadeItem delay={0.12} className="w-full">
        <Card className="surface rounded-2xl border-border/60 mb-4">
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="flex items-center justify-between text-base font-medium">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#C62828]" />
                Players
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {players.length} / 4+
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 max-h-72 overflow-y-auto thin-scroll pb-5">
            {players.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.04, duration: 0.32, ease: EASE }}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30 hover:border-[rgba(198,40,40,0.4)] transition-all duration-[220ms]"
              >
                <div className="w-8 h-8 rounded-full bg-[rgba(198,40,40,0.18)] flex items-center justify-center text-[#FF5252] text-[10px] font-bold uppercase">
                  {p.name.slice(0, 2)}
                </div>
                <span className="flex-1 text-sm font-medium">{p.name}</span>
                {p.isHost && (
                  <Crown className="w-3.5 h-3.5 text-amber-400/80" />
                )}
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    p.connected ? "bg-emerald-400/70" : "bg-muted-foreground/40"
                  }`}
                />
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </FadeItem>

      {/* Mafia count (host only) */}
      {isHost && (
        <FadeItem delay={0.2} className="w-full">
          <Card className="surface rounded-2xl border-border/60 mb-4">
            <CardHeader className="pb-3 pt-5">
              <CardTitle className="text-base font-medium">Mafia Count</CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => adjustMafia(-1)}
                  disabled={effectiveMafia <= minMafia}
                  className="h-11 w-11 rounded-lg border-border/60 hover:border-[rgba(198,40,40,0.5)] hover:bg-[rgba(198,40,40,0.12)]"
                  data-cursor="hover"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="text-center">
                  <div className="text-4xl font-semibold text-foreground tabular-nums">
                    {effectiveMafia}
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-1">
                    Mafia
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => adjustMafia(1)}
                  disabled={effectiveMafia >= maxMafia}
                  className="h-11 w-11 rounded-lg border-border/60 hover:border-[rgba(198,40,40,0.5)] hover:bg-[rgba(198,40,40,0.12)]"
                  data-cursor="hover"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground/70 text-center mt-4">
                At least 1, less than half of all players.
              </p>
            </CardContent>
          </Card>
        </FadeItem>
      )}

      <div className="mt-auto">
        {isHost ? (
          <FadeItem delay={0.28}>
            <Button
              onClick={() => actions.startGame(effectiveMafia)}
              disabled={!canStart}
              className="w-full h-14 text-base font-semibold rounded-2xl border border-[rgba(198,40,40,0.5)] bg-[rgba(198,40,40,0.15)] hover:bg-[rgba(198,40,40,0.25)] hover:border-[rgba(255,82,82,0.7)] hover:shadow-[0_0_48px_-8px_rgba(255,82,82,0.6)] active:scale-[0.98] disabled:opacity-40 disabled:shadow-none disabled:hover:bg-[rgba(198,40,40,0.15)]"
              data-cursor="hover"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Game
            </Button>
          </FadeItem>
        ) : (
          <FadeItem delay={0.28}>
            <div className="w-full text-center py-4 px-4 rounded-2xl bg-muted/20 border border-border/40 text-sm text-muted-foreground">
              Waiting for the host to start the game…
            </div>
          </FadeItem>
        )}
        {!canStart && players.length < 4 && (
          <p className="text-center text-xs text-muted-foreground/70 mt-3">
            Need at least 4 players. Currently {players.length}.
          </p>
        )}
        <FadeItem delay={0.32}>
          <Button
            variant="ghost"
            onClick={() => actions.viewLeaderboard()}
            className="w-full mt-3 text-muted-foreground hover:text-foreground hover:bg-[rgba(198,40,40,0.08)] rounded-xl"
            data-cursor="hover"
          >
            <Trophy className="w-3.5 h-3.5 mr-2" />
            View Room Leaderboard
          </Button>
        </FadeItem>
      </div>
    </div>
  );
}
