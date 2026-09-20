import type { ArenaThemeId } from "./arena-themes";
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  type MatchState,
  type Team,
  type CardId,
} from "./engine";
import type { CommanderId } from "./commanders";
export type DuelSnapshot = {
  code: string;
  round: number;
  theme: ArenaThemeId;
  mode: "core" | "control";
  countdown: number;
  waitingSeconds: number;
  score: Record<Team | "draw", number>;
  rematch: Record<Team, boolean>;
  closed: boolean;
  team: Team;
  state: MatchState | null;
  decks: Record<Team, readonly CardId[]>;
  commanders: Record<Team, CommanderId>;
  message?: string;
  actionOk?: boolean;
};
/** Render the guest from their own side; never mutate authoritative state. */
export function duelPerspective(state: MatchState, team: Team): MatchState {
  const s = structuredClone(state);
  if (team === "player") return s;
  const swap = (t: Team | null): Team | null =>
    t === null ? null : t === "player" ? "enemy" : "player";
  const rotate = (p: { x: number; y: number }) => {
    p.x = BOARD_WIDTH - p.x;
    p.y = BOARD_HEIGHT - p.y;
  };
  [s.energy.player, s.energy.enemy] = [s.energy.enemy, s.energy.player];
  [s.cores.player, s.cores.enemy] = [s.cores.enemy, s.cores.player];
  rotate(s.cores.player);
  rotate(s.cores.enemy);
  [s.controlTime.player, s.controlTime.enemy] = [
    s.controlTime.enemy,
    s.controlTime.player,
  ];
  [s.commanderCooldown, s.enemyCommanderCooldown] = [
    s.enemyCommanderCooldown,
    s.commanderCooldown,
  ];
  for (const p of s.points) {
    rotate(p);
    p.id = 8 - p.id;
    p.owner = swap(p.owner);
    p.captureTeam = swap(p.captureTeam);
  }
  s.points.sort((a, b) => a.id - b.id);
  for (const u of s.units) {
    rotate(u);
    u.team = swap(u.team)!;
  }
  for (const e of s.effects) {
    rotate(e);
    e.team = swap(e.team)!;
    if (e.targetX !== undefined) e.targetX = BOARD_WIDTH - e.targetX;
    if (e.targetY !== undefined) e.targetY = BOARD_HEIGHT - e.targetY;
  }
  if (s.winner !== "draw") s.winner = swap(s.winner);
  s.stats = { deployed: 0, unitPlays: {}, captured: 0, kills: 0, abilities: 0 };
  return s;
}
