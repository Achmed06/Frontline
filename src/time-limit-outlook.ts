import type { ControlObjective, MatchState, Team } from "./engine";

export type TimeLimitReason = "control" | "core" | "territory" | "draw";

export type TimeLimitOutlook = {
  leader: Team | "draw";
  reason: TimeLimitReason;
  label: string;
  detail: string;
};

function winnerLabel(leader: Team | "draw"): string {
  return leader === "player"
    ? "VORTEIL DU"
    : leader === "enemy"
      ? "VORTEIL GEGNER"
      : "GLEICHSTAND";
}

function percent(hp: number, maxHp: number): number {
  if (!Number.isFinite(hp) || !Number.isFinite(maxHp) || maxHp <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));
}

export function timeLimitOutlook(
  state: Pick<MatchState, "controlTime" | "cores" | "points">,
  controlObjective: ControlObjective | null,
): TimeLimitOutlook {
  if (controlObjective) {
    const difference = state.controlTime.player - state.controlTime.enemy;
    if (Math.abs(difference) > 1e-8) {
      const leader: Team = difference > 0 ? "player" : "enemy";
      return {
        leader,
        reason: "control",
        label: winnerLabel(leader),
        detail: `KONTROLLZEIT ${Math.floor(state.controlTime.player)}s : ${Math.floor(state.controlTime.enemy)}s`,
      };
    }
  }

  const playerCore = percent(state.cores.player.hp, state.cores.player.maxHp);
  const enemyCore = percent(state.cores.enemy.hp, state.cores.enemy.maxHp);
  const coreDifference =
    state.cores.player.hp / Math.max(1, state.cores.player.maxHp) -
    state.cores.enemy.hp / Math.max(1, state.cores.enemy.maxHp);
  if (Math.abs(coreDifference) > 1e-9) {
    const leader: Team = coreDifference > 0 ? "player" : "enemy";
    return {
      leader,
      reason: "core",
      label: winnerLabel(leader),
      detail: `CORE ${playerCore}% : ${enemyCore}%`,
    };
  }

  const playerTerritory = state.points.filter(
    (point) => point.owner === "player",
  ).length;
  const enemyTerritory = state.points.filter(
    (point) => point.owner === "enemy",
  ).length;
  if (playerTerritory !== enemyTerritory) {
    const leader: Team =
      playerTerritory > enemyTerritory ? "player" : "enemy";
    return {
      leader,
      reason: "territory",
      label: winnerLabel(leader),
      detail: `GEBIET ${playerTerritory} : ${enemyTerritory}`,
    };
  }

  return {
    leader: "draw",
    reason: "draw",
    label: "GLEICHSTAND",
    detail: controlObjective
      ? "KONTROLLZEIT · CORE · GEBIET GLEICH"
      : "CORE · GEBIET GLEICH",
  };
}
