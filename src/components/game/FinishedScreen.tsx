"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, LogOut, Crown } from "lucide-react";
import { FadeItem } from "@/components/game/PageTransition";
import { useGame, useActions } from "@/lib/game/store";

const EASE = [0.22, 1, 0.36, 1] as const;

export function FinishedScreen() {
  const state = useGame((s) => s.state);
  const winner = useGame((s) => s.gameWinner) ?? state?.room.winner;
  const actions = useActions();
  const me = state?.me;

  return (
    <div className="min-h-screen flex flex-col px-5 py-10 max-w-md mx-auto">
      <FadeItem delay={0.05} className="text-center mb-7">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.6, ease: EASE }}
          className="w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-5"
          style={{
            background: "linear-gradient(135deg, rgba(255,82,82,0.22), rgba(198,40,40,0.12))",
            border: "1px solid rgba(198,40,40,0.5)",
            boxShadow: "0 0 72px -12px rgba(198,40,40,0.6)",
          }}
          data-cursor="view"
        >
          <Trophy className="w-10 h-10 text-[#FF5252]" />
        </motion.div>
        <p className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground/80 mb-1">
          Game Over
        </p>
        <h1 className="text-3xl font-medium text-balance">
          {winner === "mafia" ? "Mafia won" : "Villagers won"}
        </h1>
        <p className="text-[11px] text-muted-foreground/65 mt-3 max-w-xs mx-auto text-pretty">
          Individual roles are never revealed — even after the game ends.
        </p>
      </FadeItem>

      <LeaderboardCard />

      <FadeItem delay={0.4} className="mt-auto space-y-2.5 pt-7">
        {me?.isHost ? (
          <Button
            onClick={() => actions.playAgain()}
            className="w-full h-14 text-base font-semibold rounded-2xl border border-[rgba(198,40,40,0.5)] bg-[rgba(198,40,40,0.15)] hover:bg-[rgba(198,40,40,0.25)] hover:border-[rgba(255,82,82,0.7)] hover:shadow-[0_0_48px_-8px_rgba(255,82,82,0.6)] active:scale-[0.98]"
            data-cursor="hover"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restart match
          </Button>
        ) : (
          <div className="w-full text-center py-3.5 rounded-2xl bg-muted/20 text-sm text-muted-foreground border border-border/40">
            Waiting for the host to start a new game…
          </div>
        )}
        <Button
          variant="outline"
          onClick={() => actions.leaveRoom()}
          className="w-full h-12 rounded-2xl border-border/60 bg-muted/20 hover:bg-muted/35 hover:border-[rgba(198,40,40,0.45)]"
          data-cursor="hover"
        >
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Leave Room
        </Button>
      </FadeItem>
    </div>
  );
}

export function LeaderboardCard() {
  const room = useGame((s) => s.state?.room);
  const rows = room?.leaderboard ?? [];

  return (
    <FadeItem delay={0.18}>
      <div className="surface rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-[#C62828]" />
          <h2 className="text-sm font-medium">Room Leaderboard</h2>
        </div>
        <div className="max-h-80 overflow-y-auto thin-scroll">
          {rows.length === 0 ? (
            <div className="p-7 text-center text-sm text-muted-foreground">
              No games recorded yet. Be the first!
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#1A0809]">
                <tr className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
                  <th className="text-left px-4 py-2.5 font-medium">#</th>
                  <th className="text-left px-2 py-2.5 font-medium">Player</th>
                  <th className="hidden text-right px-2 py-2.5 font-medium sm:table-cell">Mafia</th>
                  <th className="hidden text-right px-2 py-2.5 font-medium sm:table-cell">Villager</th>
                  <th className="text-right px-2 py-2.5 font-medium">Total</th>
                  <th className="text-right px-4 py-2.5 font-medium">Games</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <motion.tr
                    key={r.rank + r.displayName}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05 + i * 0.04, duration: 0.32, ease: EASE }}
                    className="border-t border-border/25 hover:bg-[rgba(198,40,40,0.06)] transition-colors duration-[220ms]"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {r.rank <= 3 ? (
                        <span className="inline-flex items-center gap-1">
                          <Crown
                            className={`w-3 h-3 ${
                              r.rank === 1
                                ? "text-[#FF5252]"
                                : r.rank === 2
                                ? "text-slate-300/80"
                                : "text-amber-700/70"
                            }`}
                          />
                          {r.rank}
                        </span>
                      ) : (
                        r.rank
                      )}
                    </td>
                    <td className="px-2 py-2.5 font-medium selectable">{r.displayName}</td>
                    <td className="hidden text-right px-2 py-2.5 font-mono tabular-nums text-muted-foreground sm:table-cell">
                      {r.winsAsMafia}
                    </td>
                    <td className="hidden text-right px-2 py-2.5 font-mono tabular-nums text-muted-foreground sm:table-cell">
                      {r.winsAsVillager}
                    </td>
                    <td className="text-right px-2 py-2.5 font-mono font-bold tabular-nums text-foreground">
                      {r.totalWins}
                    </td>
                    <td className="text-right px-4 py-2.5 font-mono text-muted-foreground tabular-nums">
                      {r.gamesPlayed}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="px-4 py-2.5 text-[10px] text-muted-foreground/55 border-t border-border/25 leading-relaxed">
          Scores belong to this room and disappear when it closes.
        </p>
      </div>
    </FadeItem>
  );
}
