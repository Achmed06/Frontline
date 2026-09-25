import type { MatchState } from "./engine";

export type MidgameHandoffKind =
  | "rebuild"
  | "split"
  | "stabilize"
  | "expand"
  | "advance";

export type MidgameHandoff = {
  kind: MidgameHandoffKind;
  tip: string;
};

const lane = (x: number) => (x < 147.5 ? 0 : x < 272.5 ? 1 : 2);

export function midgameHandoff(
  state: Pick<MatchState, "time" | "units" | "points">,
  playerActions: number,
): MidgameHandoff | null {
  const time = Number.isFinite(state.time)
    ? Math.max(0, state.time)
    : Number.POSITIVE_INFINITY;
  const actions =
    Number.isFinite(playerActions) && playerActions > 0
      ? Math.floor(playerActions)
      : 0;

  if (actions < 2 || time > 35) return null;

  const allies = state.units.filter(
    (unit) => unit.team === "player" && unit.hp > 0,
  );
  if (!allies.length)
    return {
      kind: "rebuild",
      tip: "FRONT NEU AUFBAUEN",
    };

  const player = state.points.filter(
    (point) => point.owner === "player",
  ).length;
  const enemy = state.points.filter(
    (point) => point.owner === "enemy",
  ).length;
  const neutral = state.points.filter((point) => point.owner === null).length;

  if (player < enemy)
    return {
      kind: "stabilize",
      tip: "FRONT STABILISIEREN",
    };

  const occupiedLanes = new Set(allies.map((unit) => lane(unit.x)));
  if (neutral > 0 && occupiedLanes.size === 1)
    return {
      kind: "split",
      tip: "ZWEITE LANE ÖFFNEN",
    };

  if (player > enemy)
    return {
      kind: "expand",
      tip: neutral > 0 ? "VORSPRUNG AUSBAUEN" : "DRUCK AUFBAUEN",
    };

  return {
    kind: "advance",
    tip: neutral > 0 ? "NÄCHSTEN PUNKT SICHERN" : "FRONT DURCHBRECHEN",
  };
}
