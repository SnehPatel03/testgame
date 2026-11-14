"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { create } from "zustand";
import { toast } from "sonner";
import {
  EV,
  type PersonalState,
  type Role,
  type GameWinner,
  type WinnerOption,
} from "./protocol";

// ── Persisted identity (localStorage) ─────────────────────────────────────────
// We persist {code, name, sessionToken} so a refresh/disconnect can rejoin.

interface PersistedIdentity {
  code: string;
  name: string;
  sessionToken: string;
}

const STORAGE_KEY = "mafia.identity";

function loadIdentity(): PersistedIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedIdentity;
  } catch {
    return null;
  }
}

function saveIdentity(id: PersistedIdentity | null) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, JSON.stringify(id));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

// ── Store ────────────────────────────────────────────────────────────────────

type Screen =
  | "home"
  | "lobby"
  | "roleReveal"
  | "night"
  | "morning"
  | "winnerVote"
  | "inVote"
  | "finished"
  | "leaderboard";

interface GameStore {
  screen: Screen;
  socket: Socket | null;
  connected: boolean;
  connecting: boolean;
  state: PersonalState | null;
  role: Role | null; // sent once at roleAssigned; client stores only
  lastError: string | null;
  lastToast: string | null;
  winnerResult: WinnerOption | null;
  gameWinner: GameWinner | null;
  // Local screen overrides
  showingLeaderboard: boolean;
  forceRoleReveal: boolean; // sticky until user dismisses their role-reveal card

  setScreen: (s: Screen) => void;
  setError: (e: string | null) => void;
  clearToast: () => void;
  setShowingLeaderboard: (v: boolean) => void;
  reset: () => void;
  internal: {
    onRoomUpdated: (s: PersonalState) => void;
    onRoleAssigned: (r: Role) => void;
    onWinnerResult: (w: WinnerOption) => void;
    onGameFinished: (w: GameWinner) => void;
    onError: (code: string, message: string) => void;
    onConnected: () => void;
    onDisconnected: () => void;
  };
}

export const useGame = create<GameStore>((set, get) => ({
  screen: "home",
  socket: null,
  connected: false,
  connecting: false,
  state: null,
  role: null,
  lastError: null,
  lastToast: null,
  winnerResult: null,
  gameWinner: null,
  showingLeaderboard: false,
  forceRoleReveal: false,

  setScreen: (s) => set({ screen: s }),
  setError: (e) => set({ lastError: e, lastToast: e }),
  clearToast: () => set({ lastToast: null, lastError: null }),
  setShowingLeaderboard: (v) => set({ showingLeaderboard: v }),
  reset: () => {
    saveIdentity(null);
    set({
      screen: "home",
      state: null,
      role: null,
      lastError: null,
      lastToast: null,
      winnerResult: null,
      gameWinner: null,
      showingLeaderboard: false,
      forceRoleReveal: false,
    });
  },
  internal: {
    onRoomUpdated: (s) => {
      const forceRoleReveal = get().forceRoleReveal;
      // If the user hasn't dismissed their role-reveal card yet, stay there.
      // This prevents the roleReveal screen from being skipped due to the
      // server broadcasting a roomUpdated between roleAssigned and the user's
      // confirmation.
      const next: Screen = forceRoleReveal ? "roleReveal" : deriveScreen(s, get().screen);
      set({ state: s, screen: next });
    },
    onRoleAssigned: (r) =>
      set({ role: r, forceRoleReveal: true, screen: "roleReveal" }),
    onWinnerResult: (w) => set({ winnerResult: w }),
    onGameFinished: (w) => set({ gameWinner: w, screen: "finished" }),
    onError: (_code, message) => set({ lastError: message, lastToast: message }),
    onConnected: () => set({ connected: true }),
    onDisconnected: () => set({ connected: false }),
  },
}));

function deriveScreen(s: PersonalState, current: Screen): Screen {
  // If user explicitly chose to view leaderboard, keep them there until they go back.
  if (useGame.getState().showingLeaderboard && current === "leaderboard") return "leaderboard";
  switch (s.room.status) {
    case "lobby":
      return "lobby";
    case "night":
      return "night";
    case "morning":
      return "morning";
    case "winnerVote":
      return "winnerVote";
    case "inVote":
      return "inVote";
    case "finished":
      return "finished";
    default:
      return current;
  }
}

// The role reveal screen is a manual transition controlled by the client after
// receiving roleAssigned. We override the screen by also reading local state
// in deriveScreen: but the server immediately moves to night after roleAssigned.
// So roleReveal must be shown client-side BEFORE the next roomUpdated lands.
//
// Approach: when roleAssigned arrives, we force the screen to "roleReveal" and
// stay there until the user taps "Done". Then we transition to whatever the
// latest state says.
//
// To support this, we expose a "completeReveal" hook that sets screen back to
// the server's current room.status.

export function useGameSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [ready, setReady] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (socketRef.current) return;
    const s = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
    socketRef.current = s;
    useGame.setState({ socket: s });

    const store = useGame.getState();
    s.on("connect", () => {
      setConnectionError(null);
      store.internal.onConnected();
      // Try silent rejoin if we have an identity.
      const id = loadIdentity();
      if (id) {
        s.timeout(8000).emit(EV.REJOIN_ROOM, id, (timeoutError, ack: any) => {
          if (timeoutError) {
            setConnectionError("The game service did not respond.");
            return;
          }
          if (ack?.ok) {
            setReady(true);
          } else {
            // Rejoin failed — clear identity and return home.
            saveIdentity(null);
            useGame.setState({ screen: "home", state: null, role: null });
            setReady(true);
          }
        });
      } else {
        setReady(true);
      }
    });
    s.on("disconnect", () => {
      store.internal.onDisconnected();
      setReady(false);
    });
    s.on("connect_error", (error: Error) => setConnectionError(error.message));
    s.on(EV.ROOM_UPDATED, (st: PersonalState) => store.internal.onRoomUpdated(st));
    s.on(EV.ROOM_CLOSED, () => {
      useGame.getState().reset();
      toast.info("The host closed the room.");
    });
    s.on(EV.ROLE_ASSIGNED, (p: { role: Role }) => {
      store.internal.onRoleAssigned(p.role);
      useGame.setState({ screen: "roleReveal" });
    });
    s.on(EV.WINNER_VOTE_RESULT, (p: { result: WinnerOption }) => store.internal.onWinnerResult(p.result));
    s.on(EV.GAME_FINISHED, (p: { winner: GameWinner }) => store.internal.onGameFinished(p.winner));
    s.on(EV.ERROR, (e: { code: string; message: string }) => store.internal.onError(e.code, e.message));
    s.on(EV.LEADERBOARD_UPDATED, () => {
      // Hint to refresh leaderboard; the leaderboard screen polls anyway.
    });

    return () => {
      s.removeAllListeners();
      s.disconnect();
      socketRef.current = null;
      useGame.setState({ socket: null });
    };
  }, []);

  const retry = () => {
    setConnectionError(null);
    const socket = socketRef.current;
    if (socket?.connected) socket.disconnect();
    socket?.connect();
  };

  return { ready, connectionError, retry };
}

// ── Outgoing action helpers ──────────────────────────────────────────────────

function useSocket(): Socket | null {
  return useGame((s) => s.socket);
}

export function useActions() {
  const socket = useSocket();
  return {
    createRoom: (name: string, onResult?: (r: { ok: boolean; error?: string }) => void) => {
      socket?.timeout(10000).emit(EV.CREATE_ROOM, { name }, (timeoutError, ack: any) => {
        if (timeoutError) {
          onResult?.({ ok: false, error: "The game service did not respond. Try again." });
          return;
        }
        if (ack?.ok) {
          saveIdentity({ code: ack.code, name, sessionToken: ack.sessionToken });
          useGame.setState({ screen: "lobby" });
        }
        onResult?.(ack?.ok ? { ok: true } : { ok: false, error: ack?.error ?? "Failed" });
      });
    },
    joinRoom: (code: string, name: string, onResult?: (r: { ok: boolean; error?: string }) => void) => {
      socket?.timeout(10000).emit(EV.JOIN_ROOM, { code: code.toUpperCase(), name }, (timeoutError, ack: any) => {
        if (timeoutError) {
          onResult?.({ ok: false, error: "The game service did not respond. Try again." });
          return;
        }
        if (ack?.ok) {
          saveIdentity({ code: ack.code, name, sessionToken: ack.sessionToken });
          useGame.setState({ screen: "lobby" });
        }
        onResult?.(ack?.ok ? { ok: true } : { ok: false, error: ack?.error ?? "Failed" });
      });
    },
    setMafiaCount: (count: number) => socket?.emit("setMafiaCount", { count }),
    startGame: (mafiaCount?: number) => socket?.emit(EV.START_GAME, { mafiaCount }),
    roleRevealComplete: () => {
      socket?.emit(EV.ROLE_REVEAL_COMPLETE);
      // Clear the sticky roleReveal flag and move to whatever the server says now.
      useGame.setState({ forceRoleReveal: false });
      const s = useGame.getState().state;
      useGame.setState({ screen: s ? deriveScreen(s, "night") : "night" });
    },
    submitQuizAnswer: (answerIndex: number) => socket?.emit(EV.SUBMIT_QUIZ_ANSWER, { answerIndex }),
    selectNightTarget: (targetId: string) => socket?.emit(EV.SELECT_NIGHT_TARGET, { targetId }),
    submitWinnerVote: (option: WinnerOption) => socket?.emit(EV.SUBMIT_WINNER_VOTE, { option }),
    markPlayerOut: () => socket?.emit(EV.MARK_PLAYER_OUT),
    undoPlayerOut: (targetId: string) => socket?.emit(EV.UNDO_PLAYER_OUT, { targetId }),
    toggleReady: () => socket?.emit(EV.TOGGLE_READY),
    playAgain: () => {
      socket?.emit(EV.PLAY_AGAIN);
      useGame.setState({ forceRoleReveal: false, role: null, gameWinner: null, winnerResult: null });
    },
    closeRoom: (onResult?: (error?: string) => void) => {
      socket?.timeout(5000).emit(EV.CLOSE_ROOM, (timeoutError, ack: any) => {
        if (timeoutError) return onResult?.("The game service did not respond. Try again.");
        onResult?.(ack?.ok ? undefined : ack?.error ?? "Could not close the room.");
      });
    },
    leaveRoom: () => {
      socket?.emit(EV.LEAVE_ROOM);
      saveIdentity(null);
      useGame.getState().reset();
    },
    viewLeaderboard: () => useGame.getState().setShowingLeaderboard(true),
    backFromLeaderboard: () => {
      useGame.getState().setShowingLeaderboard(false);
      const s = useGame.getState().state;
      useGame.setState({ screen: s ? deriveScreen(s, "home") : "home" });
    },
  };
}

export { loadIdentity, saveIdentity };
