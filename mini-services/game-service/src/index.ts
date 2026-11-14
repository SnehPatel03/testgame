import { createServer } from "node:http";
import { Server } from "socket.io";
import { engine } from "./engine.js";
import { EV } from "./protocol.js";

const httpServer = createServer((_req, res) => {
  // Simple HTTP health check endpoint.
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, service: "mafia-game-service" }));
});

const io = new Server(httpServer, {
  // DO NOT change the path — Caddy forwards to this port based on path "/" + query.
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

function ok(e: { ok: true; code: string; playerId: string; sessionToken: string }) {
  return { ok: true as const, code: e.code, playerId: e.playerId, sessionToken: e.sessionToken };
}

io.on("connection", (socket) => {
  console.log(`[socket] connected ${socket.id}`);

  // ── Room lifecycle ──────────────────────────────────────────────────────
  socket.on(EV.CREATE_ROOM, (payload: any, ack?: (r: any) => void) => {
    if (!engine.rateLimit(socket.id)) return ack?.({ ok: false, error: "Too many requests" });
    const name = String(payload?.name ?? "");
    const result = engine.createRoom(socket, name);
    if (!result.ok) return ack?.({ ok: false, error: result.error });
    socket.join(result.code);
    ack?.(ok(result));
    const r = engine.getRoomByCode(result.code);
    if (r) engine.broadcastRoom(r, io);
  });

  socket.on(EV.JOIN_ROOM, (payload: any, ack?: (r: any) => void) => {
    if (!engine.rateLimit(socket.id)) return ack?.({ ok: false, error: "Too many requests" });
    const code = String(payload?.code ?? "").toUpperCase();
    const name = String(payload?.name ?? "");
    const result = engine.joinRoom(socket, code, name);
    if (!result.ok) return ack?.({ ok: false, error: result.error });
    socket.join(result.code);
    ack?.(ok(result));
    const r = engine.getRoomByCode(result.code);
    if (r) engine.broadcastRoom(r, io);
  });

  socket.on(EV.REJOIN_ROOM, (payload: any, ack?: (r: any) => void) => {
    if (!engine.rateLimit(socket.id)) return ack?.({ ok: false, error: "Too many requests" });
    const code = String(payload?.code ?? "").toUpperCase();
    const name = String(payload?.name ?? "");
    const sessionToken = String(payload?.sessionToken ?? "");
    const result = engine.rejoinRoom(socket, code, name, sessionToken);
    if (!result.ok) return ack?.({ ok: false, error: result.error });
    socket.join(result.code);
    ack?.({ ok: true, code: result.code, playerId: result.playerId });
    const r = engine.getRoomByCode(result.code);
    if (r) engine.broadcastRoom(r, io);
  });

  socket.on(EV.LEAVE_ROOM, () => {
    engine.leaveRoom(socket, io);
  });

  socket.on(EV.REQUEST_STATE, () => {
    const r = engine.getRoomByPlayerId(socket.id);
    if (!r) return;
    const p = r.players.get(socket.id);
    if (!p) return;
    socket.emit(EV.ROOM_UPDATED, engine.personalState(r, p));
  });

  // ── Lobby controls ───────────────────────────────────────────────────────
  // The "setMafiaCount" event is folded into START_GAME payload and an additional
  // explicit event below. Both call into engine.setMafiaCount.
  socket.on("setMafiaCount", (payload: any) => {
    const err = engine.setMafiaCount(socket.id, Number(payload?.count ?? 1));
    if (err) return socket.emit(EV.ERROR, { code: "setMafiaCount", message: err });
    const r = engine.getRoomByPlayerId(socket.id);
    if (r) engine.broadcastRoom(r, io);
  });

  socket.on(EV.START_GAME, (payload: any) => {
    // Optional: allow host to set mafia count inline with start.
    if (payload?.mafiaCount !== undefined) {
      const e2 = engine.setMafiaCount(socket.id, Number(payload.mafiaCount));
      if (e2) return socket.emit(EV.ERROR, { code: "startGame", message: e2 });
    }
    const err = engine.startGame(socket.id, io);
    if (err) return socket.emit(EV.ERROR, { code: "startGame", message: err });
  });

  // ── Role reveal ──────────────────────────────────────────────────────────
  socket.on(EV.ROLE_REVEAL_COMPLETE, () => {
    engine.roleRevealComplete(socket.id, io);
  });

  // ── Night actions ────────────────────────────────────────────────────────
  socket.on(EV.SUBMIT_QUIZ_ANSWER, (payload: any) => {
    const err = engine.submitQuizAnswer(socket.id, payload, io);
    if (err) socket.emit(EV.ERROR, { code: "submitQuizAnswer", message: err });
  });

  socket.on(EV.SELECT_NIGHT_TARGET, (payload: any) => {
    const err = engine.selectNightTarget(socket.id, payload, io);
    if (err) socket.emit(EV.ERROR, { code: "selectNightTarget", message: err });
  });

  // ── Winner voting ────────────────────────────────────────────────────────
  socket.on(EV.SUBMIT_WINNER_VOTE, (payload: any) => {
    const err = engine.submitWinnerVote(socket.id, payload?.option, io);
    if (err) socket.emit(EV.ERROR, { code: "submitWinnerVote", message: err });
  });

  // ── In-person voting ─────────────────────────────────────────────────────
  socket.on(EV.MARK_PLAYER_OUT, () => {
    const err = engine.markPlayerOut(socket.id, io);
    if (err) socket.emit(EV.ERROR, { code: "markPlayerOut", message: err });
  });

  socket.on(EV.UNDO_PLAYER_OUT, (payload: any) => {
    const err = engine.undoPlayerOut(socket.id, String(payload?.targetId ?? ""), io);
    if (err) socket.emit(EV.ERROR, { code: "undoPlayerOut", message: err });
  });

  socket.on(EV.TOGGLE_READY, () => {
    const err = engine.toggleReady(socket.id, io);
    if (err) socket.emit(EV.ERROR, { code: "toggleReady", message: err });
  });

  socket.on(EV.NEXT_NIGHT, () => {
    const err = engine.nextNight(socket.id, io);
    if (err) socket.emit(EV.ERROR, { code: "nextNight", message: err });
  });

  socket.on(EV.PLAY_AGAIN, () => {
    const err = engine.playAgain(socket.id, io);
    if (err) socket.emit(EV.ERROR, { code: "playAgain", message: err });
  });

  socket.on(EV.CLOSE_ROOM, (ack?: (r: { ok: boolean; error?: string }) => void) => {
    const err = engine.closeRoom(socket.id, io);
    if (err) {
      socket.emit(EV.ERROR, { code: "closeRoom", message: err });
      ack?.({ ok: false, error: err });
      return;
    }
    ack?.({ ok: true });
  });

  socket.on("disconnect", () => {
    console.log(`[socket] disconnected ${socket.id}`);
    engine.handleDisconnect(socket.id, io);
  });

  socket.on("error", (e: any) => console.error(`[socket] error ${socket.id}:`, e));
});

// Periodic cleanup of empty rooms every minute.
setInterval(() => engine.cleanupEmptyRooms(), 60_000);

const PORT = Number(process.env.PORT ?? process.env.GAME_SERVICE_PORT ?? 3003);
const HOST = process.env.HOST ?? "127.0.0.1";
httpServer.listen(PORT, HOST, () => {
  console.log(`Mafia game-service running on port ${PORT}`);
});

process.on("SIGTERM", () => httpServer.close(() => process.exit(0)));
process.on("SIGINT", () => httpServer.close(() => process.exit(0)));
