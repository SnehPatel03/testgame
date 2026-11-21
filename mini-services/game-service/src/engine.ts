// Server-authoritative game engine for Mafia – No Host Needed.
//
// All role/state truth lives here. Clients only ever receive:
//   - The public room view (no roles, no picks, no individual votes)
//   - Their own personalized night task (quiz for villagers, target pick for mafia)
//   - Their own role (delivered exactly once at roleAssigned)
//
// No client-submitted role, alive state, target, or vote is trusted — every
// incoming event is validated against the server state.

import crypto from "node:crypto";
import { QUIZ_QUESTIONS } from "./questions.js";
import {
  EV,
  NIGHT_DURATION_MS,
  type Role,
  type RoomStatus,
  type GameWinner,
  type PersonalState,
  type PublicRoom,
  type PublicPlayer,
  type NightTask,
} from "./protocol.js";

// ── Internal server-side data structures ───────────────────────────────────

interface ServerPlayer {
  id: string; // socket id
  sessionTokenHash: string; // sha256(sessionToken)
  name: string;
  nameKey: string;
  role: Role | null; // null until game starts
  alive: boolean;
  connected: boolean;
  disconnectedAt: number | null;
  isHost: boolean;
  revealedRole: boolean; // has completed role-reveal
  nightTask: NightTask | null;
  quizAnswerIndex: number | null; // last submitted quiz answer (irrelevant to outcome)
}

interface NightState {
  endsAt: number; // epoch ms
  picks: Map<string, string>; // mafiaPlayerId → targetPlayerId
  // Each villager's assigned quiz (shuffled independently). Mafia get a "select" task.
  tasks: Map<string, NightTask>;
  resolutionTimer?: ReturnType<typeof setTimeout>;
}

interface PlayerVoteState { votes: Map<string, string>; endsAt: number }
interface RoomScore { displayName: string; winsAsMafia: number; winsAsVillager: number; gamesPlayed: number }

interface Room {
  code: string;
  creatorId: string; // current host's player id
  status: RoomStatus;
  round: number;
  mafiaCount: number; // desired mafia count set by host
  players: Map<string, ServerPlayer>; // playerId → player
  emptySince: number | null; // when room became empty (epoch ms)
  night: NightState | null;
  playerVote: PlayerVoteState | null;
  scores: Map<string, RoomScore>;
  morningMessage: string | null;
  winner: GameWinner | null;
  resultRecorded: boolean;
}

// ── Utilities ──────────────────────────────────────────────────────────────

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
const NAME_MAX = 24;

function randomCode(): string {
  let s = "";
  const bytes = crypto.randomBytes(5);
  for (let i = 0; i < 5; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return s;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function randomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function nameKeyOf(name: string): string {
  return name.trim().toLowerCase();
}

function sanitizeName(name: string): string {
  return name.trim().slice(0, NAME_MAX);
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function defaultMafiaCount(playerCount: number): number {
  return Math.max(1, Math.floor(playerCount / 4));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Game state store ──────────────────────────────────────────────────────

const rooms = new Map<string, Room>();

// Per-socket rate limit: max N events per second per player.
const RATE_WINDOW_MS = 1000;
const RATE_MAX_EVENTS = 8;
const lastEvents = new Map<string, number[]>(); // socketId → timestamps

function rateLimit(socketId: string): boolean {
  const now = Date.now();
  const arr = (lastEvents.get(socketId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  lastEvents.set(socketId, arr);
  return arr.length <= RATE_MAX_EVENTS;
}

// ── Build the public room view (no roles, no picks, no individual votes) ────

function publicPlayer(p: ServerPlayer): PublicPlayer {
  return {
    id: p.id,
    name: p.name,
    isHost: p.isHost,
    connected: p.connected,
    alive: p.alive,
  };
}

function publicRoom(r: Room): PublicRoom {
  const players = Array.from(r.players.values()).sort((a, b) =>
    a.isHost === b.isHost ? a.name.localeCompare(b.name) : a.isHost ? -1 : 1
  );
  const aliveCount = Array.from(r.players.values()).filter((p) => p.alive).length;
  const votedCount = r.playerVote?.votes.size ?? 0;
  const totalVoters = Array.from(r.players.values()).filter((p) => p.alive).length;
  const out: PublicRoom = {
    code: r.code,
    status: r.status,
    round: r.round,
    mafiaCount: r.mafiaCount,
    playerCount: r.players.size,
    aliveCount,
    votedCount,
    totalVoters,
    players: players.map(publicPlayer),
    leaderboard: [...r.scores.values()].map((score) => ({ ...score, totalWins: score.winsAsMafia + score.winsAsVillager }))
      .sort((a, b) => b.totalWins - a.totalWins || b.gamesPlayed - a.gamesPlayed || a.displayName.localeCompare(b.displayName))
      .map((score, i) => ({ ...score, rank: i + 1 })),
  };
  if (r.status === "night" && r.night) {
    out.nightEndsAt = r.night.endsAt;
  }
  if (r.status === "inVote" && r.playerVote) out.voteEndsAt = r.playerVote.endsAt;
  if ((r.status === "morning" || r.status === "inVote") && r.morningMessage) {
    out.morningMessage = r.morningMessage;
  }
  if (r.status === "finished") {
    out.winner = r.winner ?? undefined;
  }
  return out;
}

function personalState(r: Room, p: ServerPlayer): PersonalState {
  const state: PersonalState = {
    room: publicRoom(r),
    me: {
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      alive: p.alive,
      connected: p.connected,
    },
  };
  if (r.status === "night" && p.alive && p.nightTask) {
    state.nightTask = p.nightTask;
  }
  if (r.status === "inVote" && r.playerVote) state.meHasVoted = r.playerVote.votes.has(p.id);
  return state;
}

// ── Room helpers ───────────────────────────────────────────────────────────

function getRoomByCode(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

function getRoomByPlayerId(playerId: string): Room | undefined {
  for (const r of rooms.values()) {
    if (r.players.has(playerId)) return r;
  }
  return undefined;
}

function assignNewHost(r: Room): ServerPlayer | null {
  const candidates = Array.from(r.players.values())
    .filter((p) => p.connected && p.id !== r.creatorId)
    .sort((a, b) => a.name.localeCompare(b.name));
  if (candidates.length === 0) return null;
  const next = candidates[0];
  // Clear old host flag
  const old = r.players.get(r.creatorId);
  if (old) old.isHost = false;
  next.isHost = true;
  r.creatorId = next.id;
  return next;
}

// ── Broadcast helpers ──────────────────────────────────────────────────────

function broadcastRoom(r: Room, io: any) {
  for (const p of r.players.values()) {
    if (!p.connected) continue;
    io.to(p.id).emit(EV.ROOM_UPDATED, personalState(r, p));
  }
}

function emitError(socket: any, code: string, message: string) {
  socket.emit(EV.ERROR, { code, message });
}

// ── Phase transitions (all server-side) ────────────────────────────────────

function validateStart(r: Room): string | null {
  if (r.status !== "lobby") return "Game has already started";
  if (r.players.size < 4) return "Need at least 4 players to start";
  const m = r.mafiaCount;
  if (m < 1) return "Need at least 1 Mafia";
  if (m >= Math.floor(r.players.size / 2)) return "Mafia count must be less than half the players";
  return null;
}

function assignRoles(r: Room) {
  const ids = shuffle(Array.from(r.players.keys()));
  for (let i = 0; i < ids.length; i++) {
    const p = r.players.get(ids[i])!;
    p.role = i < r.mafiaCount ? "mafia" : "villager";
    p.alive = true;
    p.revealedRole = false;
    p.nightTask = null;
    p.quizAnswerIndex = null;
  }
}

function startNight(r: Room, io: any) {
  // §9: if fewer than 2 alive players, skip the night and go to winner voting.
  const alivePlayers = Array.from(r.players.values()).filter((p) => p.alive);
  if (alivePlayers.length < 2) {
    finishGame(r.code, io, mafiaAliveCount(r) === 0 ? "villagers" : "mafia");
    broadcastRoom(r, io);
    return;
  }
  r.status = "night";
  r.round += 1;
  r.night = {
    endsAt: Date.now() + NIGHT_DURATION_MS,
    picks: new Map(),
    tasks: new Map(),
  };
  r.morningMessage = null;

  // Assign each alive player a night task. Villagers get a random quiz;
  // mafia get the "select target" interaction styled identically.
  const aliveIds = alivePlayers.map((p) => p.id);
  const shuffledQuestions = shuffle(QUIZ_QUESTIONS);
  let qi = 0;

  // Decide a neutral-looking prompt that mimics the quiz header for mafia,
  // so mafia and villager screens look visually identical.
  const neutralPrompts = [
    "Choose the most suspicious answer.",
    "Pick the option that best fits the night.",
    "Select the option that stands out to you.",
    "Which option do you find most concerning?",
    "Pick the option that feels right for tonight.",
  ];

  for (const p of alivePlayers) {
    if (p.role === "villager") {
      const q = shuffledQuestions[qi % shuffledQuestions.length];
      qi++;
      const shuffledOptions = shuffle(q.options);
      p.nightTask = {
        kind: "quiz",
        questionId: q.id,
        question: q.question,
        options: shuffledOptions,
      };
      p.quizAnswerIndex = null;
    } else {
      // Mafia can see all living non-mafia players and cannot target a teammate.
      const realTargetIds = shuffle(aliveIds.filter((id) => r.players.get(id)?.role !== "mafia"));
      const realTargetNames = realTargetIds.map((id) => r.players.get(id)!.name);
      // Use a quiz-like prompt to keep the screen identical-looking.
      const prompt = pickRandom(neutralPrompts);
      p.nightTask = {
        kind: "select",
        questionId: "pick_" + r.round,
        question: prompt,
        options: realTargetNames,
        optionPlayerIds: realTargetIds,
        selectedTargetId: null,
      };
    }
  }

  broadcastRoom(r, io);

  setTimeout(() => endNight(r.code, io), NIGHT_DURATION_MS + 50); // small safety margin
}

function mafiaAliveCount(r: Room) { return [...r.players.values()].filter((p) => p.alive && p.role === "mafia").length; }

function endNight(code: string, io: any) {
  const r = rooms.get(code);
  if (!r || r.status !== "night" || !r.night) return;
  if (r.night.resolutionTimer) clearTimeout(r.night.resolutionTimer);

  // Collect valid mafia picks (count per target).
  const counts = new Map<string, number>();
  for (const [pickerId, targetId] of r.night.picks.entries()) {
    const picker = r.players.get(pickerId);
    const target = r.players.get(targetId);
    if (!picker || !target) continue;
    if (!picker.alive || picker.role !== "mafia") continue;
    if (!target.alive) continue;
    if (pickerId === targetId || target.role === "mafia") continue;
    counts.set(targetId, (counts.get(targetId) ?? 0) + 1);
  }

  let eliminatedId: string | null = null;
  if (counts.size > 0) {
    // Pick the player with the most votes; tie → random.
    let maxCount = 0;
    for (const c of counts.values()) if (c > maxCount) maxCount = c;
    const tied = Array.from(counts.entries()).filter(([, c]) => c === maxCount).map(([id]) => id);
    eliminatedId = pickRandom(tied);
  }

  if (eliminatedId) {
    const e = r.players.get(eliminatedId);
    if (e) e.alive = false;
    r.morningMessage = `${e!.name} was eliminated.`;
  } else {
    r.morningMessage = "Nobody was eliminated.";
  }

  r.night = null;
  r.status = "morning";

  broadcastRoom(r, io);

  // Start private remote player voting after the morning announcement.
  setTimeout(() => startRemoteVote(code, io), 8000);
}

function startRemoteVote(code: string, io: any) {
  const r = rooms.get(code);
  if (!r || r.status !== "morning") return;
  r.status = "inVote";
  r.playerVote = { votes: new Map(), endsAt: Date.now() + 5 * 60_000 };
  broadcastRoom(r, io);
  // Give remote players up to five minutes; if the deadline expires, resolve
  // using the ballots received so the room cannot remain stuck indefinitely.
  setTimeout(() => resolveRemoteVote(code, io), 5 * 60_000);
}

function resolveRemoteVote(code: string, io: any) {
  const r = rooms.get(code);
  if (!r || r.status !== "inVote" || !r.playerVote) return;
  const counts = new Map<string, number>();
  for (const [voterId, targetId] of r.playerVote.votes) {
    const voter = r.players.get(voterId), target = r.players.get(targetId);
    if (voter?.alive && target?.alive) counts.set(targetId, (counts.get(targetId) ?? 0) + 1);
  }
  let eliminatedId: string | null = null;
  const max = Math.max(0, ...counts.values());
  if (max > 0) eliminatedId = pickRandom([...counts.entries()].filter(([, n]) => n === max).map(([id]) => id));
  if (eliminatedId) {
    const eliminated = r.players.get(eliminatedId)!;
    eliminated.alive = false;
    r.morningMessage = `${eliminated.name} was voted out.`;
  } else r.morningMessage = "No player was eliminated by the vote.";
  r.playerVote = null;
  if (mafiaAliveCount(r) === 0) finishGame(code, io, "villagers");
  else if (mafiaAliveCount(r) >= [...r.players.values()].filter((p) => p.alive && p.role === "villager").length) finishGame(code, io, "mafia");
  else {
    r.status = "morning";
    broadcastRoom(r, io);
    setTimeout(() => {
      const room = rooms.get(code);
      if (room?.status === "morning") startNight(room, io);
    }, 3500);
  }
}

function finishGame(code: string, io: any, winner: GameWinner) {
  const r = rooms.get(code);
  if (!r || r.resultRecorded) return;
  r.status = "finished";
  r.winner = winner;

  // Scores are scoped to this in-memory room and disappear when it is closed.
  for (const p of r.players.values()) {
    if (!p.role) continue;
    const key = p.nameKey;
    const score = r.scores.get(key) ?? { displayName: p.name, winsAsMafia: 0, winsAsVillager: 0, gamesPlayed: 0 };
    score.gamesPlayed++;
    if (winner === "mafia" && p.role === "mafia") score.winsAsMafia++;
    if (winner === "villagers" && p.role === "villager") score.winsAsVillager++;
    r.scores.set(key, score);
  }
  r.resultRecorded = true;
  broadcastRoom(r, io);
  io.to(code).emit(EV.LEADERBOARD_UPDATED);
  io.to(code).emit(EV.GAME_FINISHED, { winner });
}

function resetForReplay(r: Room) {
  r.status = "lobby";
  r.round = 0;
  r.night = null;
  r.playerVote = null;
  r.morningMessage = null;
  r.winner = null;
  r.resultRecorded = false;
  for (const p of r.players.values()) {
    p.role = null;
    p.alive = true;
    p.revealedRole = false;
    p.nightTask = null;
    p.quizAnswerIndex = null;
  }
}

// ── Public engine API ──────────────────────────────────────────────────────

export const engine = {
  rooms,
  createRoom(socket: any, name: string): { ok: true; code: string; playerId: string; sessionToken: string } | { ok: false; error: string } {
    const clean = sanitizeName(name);
    if (!clean) return { ok: false, error: "Name is required" };
    if (clean.length < 2) return { ok: false, error: "Name must be at least 2 characters" };

    let code = randomCode();
    while (rooms.has(code)) code = randomCode();
    const playerId = socket.id;
    const sessionToken = randomToken();
    const r: Room = {
      code,
      creatorId: playerId,
      status: "lobby",
      round: 0,
      mafiaCount: defaultMafiaCount(1),
      players: new Map(),
      emptySince: null,
      night: null,
      playerVote: null,
      scores: new Map(),
      morningMessage: null,
      winner: null,
      resultRecorded: false,
    };
    const p: ServerPlayer = {
      id: playerId,
      sessionTokenHash: hashToken(sessionToken),
      name: clean,
      nameKey: nameKeyOf(clean),
      role: null,
      alive: true,
      connected: true,
      disconnectedAt: null,
      isHost: true,
      revealedRole: false,
      nightTask: null,
      quizAnswerIndex: null,
    };
    r.players.set(playerId, p);
    rooms.set(code, r);
    return { ok: true, code, playerId, sessionToken };
  },

  joinRoom(socket: any, code: string, name: string): { ok: true; code: string; playerId: string; sessionToken: string } | { ok: false; error: string } {
    const clean = sanitizeName(name);
    if (!clean) return { ok: false, error: "Name is required" };
    if (clean.length < 2) return { ok: false, error: "Name must be at least 2 characters" };
    const r = getRoomByCode(code);
    if (!r) return { ok: false, error: "Invalid room code" };
    if (r.status !== "lobby") return { ok: false, error: "Game has already started" };
    const key = nameKeyOf(clean);
    for (const p of r.players.values()) {
      if (p.nameKey === key) return { ok: false, error: "Name already taken in this room" };
    }
    const playerId = socket.id;
    const sessionToken = randomToken();
    const p: ServerPlayer = {
      id: playerId,
      sessionTokenHash: hashToken(sessionToken),
      name: clean,
      nameKey: key,
      role: null,
      alive: true,
      connected: true,
      disconnectedAt: null,
      isHost: false,
      revealedRole: false,
      nightTask: null,
      quizAnswerIndex: null,
    };
    r.players.set(playerId, p);
    // Update default mafia count to match new player count.
    r.mafiaCount = defaultMafiaCount(r.players.size);
    r.emptySince = null;
    return { ok: true, code: r.code, playerId, sessionToken };
  },

  rejoinRoom(socket: any, code: string, name: string, sessionToken: string): { ok: true; code: string; playerId: string } | { ok: false; error: string } {
    const clean = sanitizeName(name);
    if (!clean) return { ok: false, error: "Name is required" };
    const r = getRoomByCode(code);
    if (!r) return { ok: false, error: "Invalid room code" };
    const key = nameKeyOf(clean);
    const old = Array.from(r.players.values()).find((p) => p.nameKey === key);
    if (!old) return { ok: false, error: "No player with that name in this room" };
    if (hashToken(sessionToken) !== old.sessionTokenHash) return { ok: false, error: "Invalid session token" };

    // Bind this new socket to the existing player record.
    const oldId = old.id;
    old.id = socket.id;
    old.connected = true;
    old.disconnectedAt = null;
    r.players.delete(oldId);
    r.players.set(socket.id, old);
    if (r.creatorId === oldId) r.creatorId = socket.id;
    return { ok: true, code: r.code, playerId: socket.id };
  },

  leaveRoom(socket: any, io: any) {
    const r = getRoomByPlayerId(socket.id);
    if (!r) return;
    this.handleDisconnect(socket.id, io);
  },

  handleDisconnect(playerId: string, io: any) {
    const r = getRoomByPlayerId(playerId);
    if (!r) return;
    const p = r.players.get(playerId);
    if (!p) return;
    p.connected = false;
    p.disconnectedAt = Date.now();

    // If host left, transfer host.
    if (r.creatorId === playerId) {
      assignNewHost(r);
    }

    // If everyone is disconnected, schedule cleanup.
    if (Array.from(r.players.values()).every((pp) => !pp.connected)) {
      r.emptySince = Date.now();
    }

    broadcastRoom(r, io);
  },

  getRoomByPlayerId(playerId: string) {
    return getRoomByPlayerId(playerId);
  },

  getRoomByCode(code: string) {
    return getRoomByCode(code);
  },

  setMafiaCount(playerId: string, count: number): string | null {
    const r = getRoomByPlayerId(playerId);
    if (!r) return "Not in a room";
    const p = r.players.get(playerId)!;
    if (!p.isHost) return "Only the host can change Mafia count";
    if (r.status !== "lobby") return "Game has already started";
    const c = Math.floor(count);
    if (!Number.isFinite(c) || c < 1) return "Need at least 1 Mafia";
    if (c >= Math.floor(r.players.size / 2)) return "Mafia count must be less than half the players";
    r.mafiaCount = c;
    return null;
  },

  startGame(playerId: string, io: any): string | null {
    const r = getRoomByPlayerId(playerId);
    if (!r) return "Not in a room";
    const p = r.players.get(playerId)!;
    if (!p.isHost) return "Only the host can start the game";
    const err = validateStart(r);
    if (err) return err;
    assignRoles(r);
    for (const pp of r.players.values()) {
      const teammates = pp.role === "mafia"
        ? [...r.players.values()].filter((mate) => mate.role === "mafia" && mate.id !== pp.id).map((mate) => ({ id: mate.id, name: mate.name }))
        : [];
      io.to(pp.id).emit(EV.ROLE_ASSIGNED, { role: pp.role, teammates });
    }
    // Schedule the timeout-based start.
    setTimeout(() => {
      const room = rooms.get(r.code);
      if (!room || room.status !== "lobby" || room.round !== 0) return;
      // Force-start the night even if not everyone has confirmed.
      for (const pp of room.players.values()) pp.revealedRole = true;
      startNight(room, io);
    }, 10_000);
    return null;
  },

  roleRevealComplete(playerId: string, io: any) {
    const r = getRoomByPlayerId(playerId);
    if (!r) return;
    const p = r.players.get(playerId)!;
    p.revealedRole = true;
    // The phase advances on the shared ten-second timer.
  },

  submitQuizAnswer(playerId: string, payload: any, io: any): string | null {
    const r = getRoomByPlayerId(playerId);
    if (!r) return "Not in a room";
    if (r.status !== "night" || !r.night) return "Not in the night phase";
    const p = r.players.get(playerId)!;
    if (!p.alive) return "Dead players cannot act";
    if (p.role !== "villager") return "Invalid action for your role";
    if (Date.now() > r.night.endsAt) return "Night has ended";
    if (!p.nightTask || p.nightTask.kind !== "quiz") return "No active quiz";
    const idx = Number(payload?.answerIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx >= p.nightTask.options.length) return "Invalid answer";
    p.quizAnswerIndex = idx;
    // Answers do not affect gameplay. No feedback sent.
    return null;
  },

  selectNightTarget(playerId: string, payload: any, io: any): string | null {
    const r = getRoomByPlayerId(playerId);
    if (!r) return "Not in a room";
    if (r.status !== "night" || !r.night) return "Not in the night phase";
    const p = r.players.get(playerId)!;
    if (!p.alive) return "Dead players cannot act";
    if (p.role !== "mafia") return "Invalid action for your role";
    if (Date.now() > r.night.endsAt) return "Night has ended";
    if (!p.nightTask || p.nightTask.kind !== "select") return "No active target list";
    const targetId = String(payload?.targetId ?? "");
    // "Pass" sentinel — a neutral option used to pad the mafia screen to 4
    // options. Selecting it clears any prior pick and counts as no kill.
    if (targetId === "__pass__") {
      r.night.picks.delete(playerId);
      p.nightTask.selectedTargetId = null;
      return null;
    }
    const target = r.players.get(targetId);
    if (!target) return "Invalid target";
    if (!target.alive) return "Target is not alive";
    if (target.role === "mafia") return "Mafia cannot target another Mafia";
    if (targetId === playerId) return "Cannot select yourself";
    // Validate the target is in this mafia's option list (defense in depth).
    if (!p.nightTask.optionPlayerIds.includes(targetId)) return "Invalid target";
    r.night.picks.set(playerId, targetId);
    p.nightTask.selectedTargetId = targetId;
    if (r.night.resolutionTimer) clearTimeout(r.night.resolutionTimer);
    r.night.resolutionTimer = setTimeout(() => endNight(r.code, io), 3000);
    // Don't broadcast — never reveal Mafia selection state to others.
    return null;
  },

  submitPlayerVote(playerId: string, targetId: any, io: any): string | null {
    const r = getRoomByPlayerId(playerId);
    if (!r || r.status !== "inVote" || !r.playerVote) return "Not in the voting phase";
    const voter = r.players.get(playerId);
    const target = r.players.get(String(targetId ?? ""));
    if (!voter?.alive) return "Only living players can vote";
    if (!target?.alive) return "Choose a living player";
    if (target.id === voter.id) return "You cannot vote for yourself";
    r.playerVote.votes.set(playerId, target.id);
    broadcastRoom(r, io);
    const voters = [...r.players.values()].filter((p) => p.alive && p.connected);
    if (voters.length > 0 && voters.every((p) => r.playerVote!.votes.has(p.id))) resolveRemoteVote(r.code, io);
    return null;
  },

  playAgain(hostId: string, io: any): string | null {
    const r = getRoomByPlayerId(hostId);
    if (!r) return "Not in a room";
    const host = r.players.get(hostId)!;
    if (!host.isHost) return "Only the host can start a new game";
    if (r.status !== "finished") return "Game is not finished yet";
    // Drop disconnected players (they must rejoin as new sockets).
    for (const [pid, p] of Array.from(r.players.entries())) {
      if (!p.connected) r.players.delete(pid);
    }
    if (r.players.size < 4) return "Need at least 4 connected players to play again";
    resetForReplay(r);
    r.mafiaCount = defaultMafiaCount(r.players.size);
    broadcastRoom(r, io);
    return null;
  },

  closeRoom(hostId: string, io: any): string | null {
    const r = getRoomByPlayerId(hostId);
    if (!r) return "Not in a room";
    const host = r.players.get(hostId);
    if (!host?.isHost) return "Only the host can close this room";
    io.to(r.code).emit(EV.ROOM_CLOSED);
    rooms.delete(r.code);
    return null;
  },

  // Garbage-collect empty rooms older than ROOM_EMPTY_TTL_MS.
  cleanupEmptyRooms() {
    const now = Date.now();
    for (const [code, r] of rooms) {
      if (Array.from(r.players.values()).every((p) => !p.connected)) {
        if (r.emptySince == null) r.emptySince = now;
        if (now - r.emptySince > 10 * 60 * 1000) rooms.delete(code);
      }
    }
  },

  rateLimit,
  broadcastRoom,
  personalState,
  publicRoom,
};
