// Shared protocol types for Mafia – No Host Needed.

export type Role = "mafia" | "villager";
export type RoomStatus = "lobby" | "night" | "morning" | "inVote" | "finished";
export type GameWinner = "villagers" | "mafia";

// ── Public player view (sent to clients) ────────────────────────────────────
export interface PublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  alive: boolean;
}

// ── Public room view (sent to clients) ──────────────────────────────────────
export interface PublicRoom {
  code: string;
  status: RoomStatus;
  round: number;
  mafiaCount: number;
  playerCount: number;
  aliveCount: number;
  votedCount: number;
  totalVoters: number;
  players: PublicPlayer[];
  // Phase-specific (only present when relevant)
  nightEndsAt?: number; // epoch ms, only during night
  winner?: GameWinner;
  morningMessage?: string;
  leaderboard: Array<{ rank: number; displayName: string; winsAsMafia: number; winsAsVillager: number; totalWins: number; gamesPlayed: number }>;
  voteEndsAt?: number;
}

// ── Personalized state for a single client ──────────────────────────────────
export interface PersonalState {
  room: PublicRoom;
  me: {
    id: string;
    name: string;
    isHost: boolean;
    alive: boolean;
    connected: boolean;
  };
  // Role is sent exactly once at roleAssigned event; clients store it.
  // We never resend the role from the server after it has been delivered.
  role?: Role;
  meHasVoted?: boolean;
  // During the night phase only:
  nightTask?: NightTask;
}

// The night task payload a client receives. Villagers get a quiz;
// mafia get a target list. The shape is identical to keep the screen
// visually identical — both are arrays of "options" with optional metadata.
export type NightTask =
  | {
      kind: "quiz";
      questionId: string;
      question: string;
      options: string[]; // shuffled, no marked correct answer
    }
  | {
      kind: "select";
      questionId: string;
      question: string; // a neutral prompt that looks like the quiz header
      options: string[]; // names of alive players (excluding self), styled like quiz options
      optionPlayerIds: string[]; // parallel to options, used by client only
      selectedTargetId?: string | null;
    };

// ── Socket event names ──────────────────────────────────────────────────────
export const EV = {
  // Client → Server
  CREATE_ROOM: "createRoom",
  JOIN_ROOM: "joinRoom",
  REJOIN_ROOM: "rejoinRoom",
  LEAVE_ROOM: "leaveRoom",
  START_GAME: "startGame",
  ROLE_REVEAL_COMPLETE: "roleRevealComplete",
  SUBMIT_QUIZ_ANSWER: "submitQuizAnswer",
  SELECT_NIGHT_TARGET: "selectNightTarget",
  SUBMIT_PLAYER_VOTE: "submitPlayerVote",
  PLAY_AGAIN: "playAgain",
  CLOSE_ROOM: "closeRoom",
  REQUEST_STATE: "requestState",

  // Server → Client
  ROOM_UPDATED: "roomUpdated",
  ROLE_ASSIGNED: "roleAssigned",
  NIGHT_START: "nightStart",
  NIGHT_RESULT: "nightResult",
  MORNING_ANNOUNCEMENT: "morningAnnouncement",
  GAME_FINISHED: "gameFinished",
  ROOM_CLOSED: "roomClosed",
  LEADERBOARD_UPDATED: "leaderboardUpdated",
  ERROR: "error",
} as const;

export const NIGHT_DURATION_MS = 15_000;
export const ROOM_EMPTY_TTL_MS = 10 * 60 * 1000;
export const DISCONNECTED_VOTER_GRACE_MS = 30_000;
