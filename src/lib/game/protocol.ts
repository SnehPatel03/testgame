// Frontend copy of the shared protocol. Kept in sync with
// mini-services/game-service/src/protocol.ts.
//
// IMPORTANT: We never trust client-submitted roles, alive states, or results.
// This file only describes what the SERVER tells us.

export type Role = "mafia" | "villager";
export type RoomStatus = "lobby" | "night" | "morning" | "inVote" | "finished";
export type GameWinner = "villagers" | "mafia";

export interface PublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  alive: boolean;
}

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
  nightEndsAt?: number;
  winner?: GameWinner;
  morningMessage?: string;
  leaderboard: Array<{ rank: number; displayName: string; winsAsMafia: number; winsAsVillager: number; totalWins: number; gamesPlayed: number }>;
  voteEndsAt?: number;
}

export interface PersonalState {
  room: PublicRoom;
  me: {
    id: string;
    name: string;
    isHost: boolean;
    alive: boolean;
    connected: boolean;
  };
  role?: Role;
  meHasVoted?: boolean;
  mafiaTeammates?: Array<{ id: string; name: string }>;
  nightTask?: NightTask;
}

export type NightTask =
  | {
      kind: "quiz";
      questionId: string;
      question: string;
      options: string[];
    }
  | {
      kind: "select";
      questionId: string;
      question: string;
      options: string[];
      optionPlayerIds: string[];
      selectedTargetId?: string | null;
    };

export const EV = {
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
