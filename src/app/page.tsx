"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useGameSocket, useGame } from "@/lib/game/store";
import { HomeScreen } from "@/components/game/HomeScreen";
import { PageTransition } from "@/components/game/PageTransition";
import { HostRoomControls } from "@/components/game/HostRoomControls";

const ScreenLoading = () => (
  <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground" role="status">
    Loading game…
  </div>
);

const LobbyScreen = dynamic(
  () => import("@/components/game/LobbyScreen").then((module) => module.LobbyScreen),
  { loading: ScreenLoading },
);
const RoleRevealScreen = dynamic(
  () => import("@/components/game/RoleRevealScreen").then((module) => module.RoleRevealScreen),
  { loading: ScreenLoading },
);
const NightScreen = dynamic(
  () => import("@/components/game/NightScreen").then((module) => module.NightScreen),
  { loading: ScreenLoading },
);
const MorningScreen = dynamic(
  () => import("@/components/game/MorningScreen").then((module) => module.MorningScreen),
  { loading: ScreenLoading },
);
const WinnerVoteScreen = dynamic(
  () => import("@/components/game/WinnerVoteScreen").then((module) => module.WinnerVoteScreen),
  { loading: ScreenLoading },
);
const InVoteScreen = dynamic(
  () => import("@/components/game/InVoteScreen").then((module) => module.InVoteScreen),
  { loading: ScreenLoading },
);
const FinishedScreen = dynamic(
  () => import("@/components/game/FinishedScreen").then((module) => module.FinishedScreen),
  { loading: ScreenLoading },
);
const LeaderboardScreen = dynamic(
  () => import("@/components/game/LeaderboardScreen").then((module) => module.LeaderboardScreen),
  { loading: ScreenLoading },
);

export default function Home() {
  const { ready, connectionError, retry } = useGameSocket();
  const screen = useGame((s) => s.screen);
  const showingLeaderboard = useGame((s) => s.showingLeaderboard);
  const state = useGame((s) => s.state);

  const lastError = useGame((s) => s.lastError);
  useEffect(() => {
    if (lastError) {
      const t = setTimeout(() => useGame.getState().clearToast(), 3000);
      return () => clearTimeout(t);
    }
  }, [lastError]);

  // If the user explicitly chose to view leaderboard from lobby, that wins.
  let view = screen;
  if (showingLeaderboard && screen === "lobby") view = "leaderboard";

  // If we have no state and the user landed on a screen requiring one, send them home.
  if (!state && view !== "home" && view !== "leaderboard") {
    view = "home";
  }

  return (
    <div className="min-h-screen bg-ambient bg-grain">
      <PageTransition key={view} keyId={view}>
          {view === "home" && (
            <HomeScreen
              ready={ready}
              connectionError={connectionError}
              onRetry={retry}
            />
          )}
          {view === "lobby" && <LobbyScreen />}
          {view === "roleReveal" && <RoleRevealScreen />}
          {view === "night" && <NightScreen />}
          {view === "morning" && <MorningScreen />}
          {view === "winnerVote" && <WinnerVoteScreen />}
          {view === "inVote" && <InVoteScreen />}
          {view === "finished" && <FinishedScreen />}
          {view === "leaderboard" && <LeaderboardScreen />}
      </PageTransition>
      {state && <HostRoomControls />}
    </div>
  );
}
