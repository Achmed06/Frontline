import type {
  ControlObjective,
  ControlPoint,
  MatchState,
  Unit,
} from "./engine";

export type OpeningLaneRole =
  | "contact"
  | "objective"
  | "direct"
  | "flank";

export type OpeningLaneRead = {
  column: number;
  role: OpeningLaneRole;
  label: string;
  detail: string;
};

type OpeningLaneState = Pick<MatchState, "time" | "units" | "points">;

const unitColumn = (unit: Pick<Unit, "x">) =>
  unit.x < 147.5 ? 0 : unit.x < 272.5 ? 1 : 2;

export function openingLaneReads(
  state: OpeningLaneState,
  objective?: ControlObjective | null,
): OpeningLaneRead[] | null {
  const time =
    Number.isFinite(state.time) && state.time >= 0
      ? state.time
      : Number.POSITIVE_INFINITY;
  if (time > 20) return null;

  return [0, 1, 2].map((column) => {
    const middlePoint = state.points[3 + column] as
      | ControlPoint
      | undefined;
    const contact = state.units.some(
      (unit) =>
        unit.team === "enemy" &&
        unit.hp > 0 &&
        unitColumn(unit) === column,
    );
    const objectiveLane =
      objective?.pointIds.some((id) => id % 3 === column) &&
      middlePoint?.owner !== "player";

    if (contact)
      return {
        column,
        role: "contact" as const,
        label: "KONTAKT",
        detail: "GEGNER IN LANE",
      };

    if (objectiveLane)
      return {
        column,
        role: "objective" as const,
        label: "ZIEL",
        detail: "KONTROLLPUNKT ZÄHLT",
      };

    if (column === 1)
      return {
        column,
        role: "direct" as const,
        label: "DIREKT",
        detail: "CORE KURZ · TURRET FRÜH",
      };

    return {
      column,
      role: "flank" as const,
      label: "FLANKE",
      detail: "CORE LÄNGER · TURRET SPÄTER",
    };
  });
}
