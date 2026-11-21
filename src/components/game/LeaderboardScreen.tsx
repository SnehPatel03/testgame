"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { FadeItem } from "@/components/game/PageTransition";
import { useActions } from "@/lib/game/store";
import { useGame } from "@/lib/game/store";
import { LeaderboardCard } from "./FinishedScreen";

export function LeaderboardScreen() {
  const actions = useActions();
  const code = useGame((s) => s.state?.room.code);
  return (
    <div className="min-h-screen flex flex-col px-5 py-8 max-w-md mx-auto">
      <FadeItem delay={0.05} className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => actions.backFromLeaderboard()}
          aria-label="Back"
          className="text-muted-foreground hover:text-foreground hover:bg-[rgba(198,40,40,0.12)] rounded-lg"
          data-cursor="hover"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-medium">Room Leaderboard {code ? `· ${code}` : ""}</h1>
      </FadeItem>
      <LeaderboardCard />
    </div>
  );
}
