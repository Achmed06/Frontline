import {
  unitCombatTarget,
  type MatchState,
  type Team,
} from "./engine";

export type CoreAssault = {
  defender: Team;
  attacker: Team;
  count: number;
  unitIds: readonly number[];
  active: boolean;
  label: string;
};

const other = (team: Team): Team => (team === "player" ? "enemy" : "player");

export function coreAssault(
  state: MatchState,
  defender: Team,
): CoreAssault {
  const attacker = other(defender);
  const unitIds = state.units
    .filter((unit) => unit.team === attacker && unit.hp > 0)
    .filter((unit) => unitCombatTarget(state, unit)?.core === true)
    .map((unit) => unit.id)
    .sort((a, b) => a - b);

  const count = unitIds.length;
  return {
    defender,
    attacker,
    count,
    unitIds,
    active: count > 0,
    label:
      count === 0
        ? ""
        : defender === "enemy"
          ? `DURCHBRUCH ×${count}`
          : `CORE UNTER FEUER ×${count}`,
  };
}
