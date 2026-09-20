import { isArenaTheme, type ArenaThemeId } from "../src/arena-themes";
import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  Match,
  TRAINING_CONTROL,
  isValidDeck,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  type CardId,
  type Team,
} from "../src/engine";
import { isCommanderId, type CommanderId } from "../src/commanders";
import type { DuelSnapshot } from "../src/duel-protocol";
export const DUEL_COUNTDOWN_MS = 3000;
const WAITING_ROOM_MS = 300000;
const ROOM_LIFETIME_MS = 600000;
const ENDED_IDLE_MS = 60000;
type Seat = {
  token: string;
  deck: CardId[];
  commander: CommanderId;
  seen: number;
  seq: number;
  window: number;
  actions: number;
};
type Room = {
  code: string;
  seats: Partial<Record<Team, Seat>>;
  match: Match | null;
  created: number;
  round: number;
  ready: Record<Team, boolean>;
  closed: boolean;
  score: Record<Team | "draw", number>;
  scoredRound: number;
  startsAt: number;
  theme: ArenaThemeId;
  mode: "core" | "control";
};
export class DuelService {
  private rooms = new Map<string, Room>();
  constructor(private now = Date.now) {}
  handle(input: Record<string, unknown>) {
    const time = this.now();
    this.pruneRooms(time);
    if (input.op === "create" || input.op === "join") {
      if (!isValidDeck(input.deck) || !isCommanderId(input.commander))
        throw Error("Ungültiges Deck oder Kommando.");
      const seat: Seat = {
        token: randomBytes(24).toString("hex"),
        deck: [...input.deck],
        commander: input.commander,
        seen: time,
        seq: 0,
        window: time,
        actions: 0,
      };
      let room: Room;
      let team: Team;
      if (input.op === "create") {
        if (input.mode !== undefined && input.mode !== "core" && input.mode !== "control") throw Error("Ungültiger Spielmodus.");
        if (input.theme !== undefined && !isArenaTheme(input.theme)) throw Error("Ungültiger Schauplatz.");
        if (this.rooms.size >= 12) throw Error("Alle Duellplätze sind belegt.");
        let code: string;
        do {
          code = randomBytes(3).toString("hex").toUpperCase();
        } while (this.rooms.has(code));
        room = { code, seats: { player: seat }, match: null, created: time, round: 1, ready: { player: false, enemy: false }, closed: false, score: { player: 0, enemy: 0, draw: 0 }, scoredRound: 0, startsAt: 0, theme: isArenaTheme(input.theme) ? input.theme : "coast", mode: input.mode === "control" ? "control" : "core" };
        this.rooms.set(code, room);
        team = "player";
      } else {
        const found =
          typeof input.code === "string"
            ? this.rooms.get(input.code.toUpperCase())
            : undefined;
        if (!found || found.seats.enemy || time - found.created >= WAITING_ROOM_MS)
          throw Error("Raum nicht verfügbar.");
        room = found;
        room.seats.enemy = seat;
        team = "enemy";
        this.startMatch(room, time);
      }
      return { ...this.snapshot(room, team), token: seat.token };
    }
    const room =
      typeof input.code === "string" ? this.rooms.get(input.code) : undefined;
    const team: Team | undefined =
      room &&
      (room.seats.player?.token === input.token
        ? "player"
        : room.seats.enemy?.token === input.token
          ? "enemy"
          : undefined);
    if (!room || !team || typeof input.token !== "string")
      throw Error("Duell nicht gefunden. Bitte neuen Raum erstellen.");
    const seat = room.seats[team]!;
    seat.seen = time;
    if (input.op === "sync") return this.snapshot(room, team);
    const m = room.match;
    if (input.op === "rematch") {
      if (!m || m.state.phase !== "ended" || room.closed || input.round !== room.round)
        throw Error("Revanche nicht verfügbar.");
      this.recordResult(room);
      room.ready[team] = true;
      if (room.ready.player && room.ready.enemy) {
        room.round++;
        this.startMatch(room, time);
      }
      return this.snapshot(room, team);
    }
    if (input.op === "leave") {
      room.closed = true;
      room.ready = { player: false, enemy: false };
      if (m && m.state.phase !== "ended") {
        m.state.phase = "ended";
        m.state.winner = team === "player" ? "enemy" : "player";
        m.state.reason = "Ein Spieler hat das Duell verlassen.";
      }
      if (!m) this.rooms.delete(room.code);
      return this.snapshot(room, team);
    }
    if (input.round !== undefined && input.round !== room.round) throw Error("Diese Aktion gehört zum vorherigen Duell.");
    if (!m || m.state.phase === "ended")
      throw Error("Das Gefecht ist nicht aktiv.");
    if (time < room.startsAt) throw Error("Das Duell beginnt gleich.");
    if (!Number.isSafeInteger(input.seq) || (input.seq as number) < 1)
      throw Error("Ungültige Aktion.");
    if ((input.seq as number) <= seat.seq) return this.snapshot(room, team);
    if (time - seat.window >= 1000) {
      seat.window = time;
      seat.actions = 0;
    }
    if (++seat.actions > 12) throw Error("Zu viele Aktionen.");
    seat.seq = input.seq as number;
    let result: { ok: boolean; message: string };
    if (input.op === "commander") result = m.activateCommander(team);
    else if (
      input.op === "play" &&
      typeof input.card === "string" &&
      typeof input.x === "number" &&
      typeof input.y === "number" &&
      Number.isFinite(input.x) &&
      Number.isFinite(input.y)
    ) {
      const x = team === "enemy" ? BOARD_WIDTH - input.x : input.x,
        y = team === "enemy" ? BOARD_HEIGHT - input.y : input.y;
      result = m.play(team, input.card, x, y);
    } else throw Error("Ungültige Aktion.");
    return { ...this.snapshot(room, team), message: result.message, actionOk: result.ok };
  }
  private startMatch(room: Room, time: number) {
    const host = room.seats.player!, guest = room.seats.enemy!;
    room.match = new Match({
      controlObjective: room.mode === "control" ? TRAINING_CONTROL : undefined,
      botEnabled: false, seed: randomBytes(4).readUInt32LE(),
      playerDeck: host.deck, enemyDeck: guest.deck,
      playerCommander: host.commander, enemyCommander: guest.commander,
    });
    room.created = time;
    room.startsAt = time + DUEL_COUNTDOWN_MS;
    room.ready = { player: false, enemy: false };
    for (const seat of [host, guest]) {
      seat.seen = time; seat.window = time; seat.actions = 0;
    }
  }
  private recordResult(room: Room) {
    const state = room.match?.state;
    if (!state || state.phase !== "ended" || !state.winner || room.scoredRound === room.round) return;
    room.score[state.winner]++;
    room.scoredRound = room.round;
  }
  private snapshot(room: Room, team: Team): DuelSnapshot {
    this.recordResult(room);
    const host = room.seats.player!,
      guest = room.seats.enemy;
    return {
      code: room.code,
      round: room.round,
      theme: room.theme,
      mode: room.mode,
      waitingSeconds: room.match ? 0 : Math.max(0, Math.ceil((WAITING_ROOM_MS - (this.now() - room.created)) / 1000)),
      countdown: room.match && room.match.state.phase !== "ended" ? Math.max(0, Math.ceil((room.startsAt - this.now()) / 1000)) : 0,
      score: { ...room.score },
      rematch: { ...room.ready },
      closed: room.closed,
      team,
      state: room.match?.state ?? null,
      decks: { player: host.deck, enemy: guest?.deck ?? host.deck },
      commanders: {
        player: host.commander,
        enemy: guest?.commander ?? host.commander,
      },
    };
  }
  private pruneRooms(now: number) {
    for (const [code, room] of this.rooms) {
      const expired = now - room.created >= (room.match ? ROOM_LIFETIME_MS : WAITING_ROOM_MS);
      const abandonedResult = room.match?.state.phase === "ended" &&
        Object.values(room.seats).every(seat => now - seat.seen >= ENDED_IDLE_MS);
      if (expired || abandonedResult) this.rooms.delete(code);
    }
  }
  tick(seconds: number) {
    const now = this.now();
    this.pruneRooms(now);
    for (const room of this.rooms.values()) {
      const m = room.match;
      if (!m) continue;
      if (m.state.phase === "ended") continue;
      const absent = (["player", "enemy"] as const).filter(
        (team) => now - room.seats[team]!.seen > 20000,
      );
      if (absent.length) {
        m.state.phase = "ended";
        m.state.winner =
          absent.length === 2
            ? "draw"
            : absent[0] === "player"
              ? "enemy"
              : "player";
        m.state.reason = "Verbindung länger als 20 Sekunden unterbrochen.";
        continue;
      }
      if (now < room.startsAt) continue;
      m.update(Math.max(0, Math.min(seconds, 0.25, (now - room.startsAt) / 1000)));
    }
  }
}
export function duelMiddleware(service: DuelService, allowedOrigins = (process.env.DUEL_ALLOWED_ORIGINS ?? "").split(",").map(value => value.trim()).filter(Boolean)) {
  const nativeOrigins = new Set(allowedOrigins);
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    if (req.url?.split("?")[0] !== "/api/duel") {
      next();
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json");
    try {
      const origin = req.headers.origin;
      const crossOriginAllowed = Boolean(origin && nativeOrigins.has(origin));
      if (origin && !crossOriginAllowed) {
        const parsed = new URL(origin);
        if (!["http:", "https:"].includes(parsed.protocol) || parsed.host !== req.headers.host)
          throw Error("Fremder Ursprung abgelehnt.");
      }
      if (crossOriginAllowed) {
        res.setHeader("Access-Control-Allow-Origin", origin!);
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      }
      if (req.method === "OPTIONS" && crossOriginAllowed) {
        res.statusCode = 204;
        res.end();
        return;
      }
      if (
        req.method !== "POST" ||
        !req.headers["content-type"]?.startsWith("application/json")
      )
        throw Error("JSON POST erforderlich.");
      let body = "";
      for await (const chunk of req) {
        body += chunk.toString();
        if (body.length > 4096) throw Error("Anfrage zu groß.");
      }
      const input = JSON.parse(body);
      if (!input || typeof input !== "object" || Array.isArray(input))
        throw Error("Ungültige Anfrage.");
      res.end(JSON.stringify(service.handle(input)));
    } catch (error) {
      res.statusCode = 400;
      res.end(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : "Anfrage fehlgeschlagen.",
        }),
      );
    }
  };
}
