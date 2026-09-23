import { COMMANDERS } from "./commanders";
import { CARDS } from "./engine";
import { objectiveDescription, type Mission } from "./campaign";

export type MissionBriefingSnapshot = {
  mode: "core" | "control";
  modeLabel: string;
  difficultyLabel: string;
  playerTerritory: number;
  enemyTerritory: number;
  neutralTerritory: number;
  objective: string;
  objectiveMeta: string;
  enemyCommander: string;
  enemyAverageCost: number;
  enemyUnits: number;
  enemyAbilities: number;
  starTargets: readonly string[];
};

export function missionBriefingSnapshot(
  mission: Mission,
): MissionBriefingSnapshot {
  const difficultyLabel =
    mission.difficulty === "rookie"
      ? "REKRUT"
      : mission.difficulty === "standard"
        ? "TAKTIKER"
        : "VETERAN";
  const enemyCards = mission.enemyDeck
    .map((id) => CARDS.find((card) => card.id === id))
    .filter((card): card is (typeof CARDS)[number] => Boolean(card));
  const enemyUnits = enemyCards.filter((card) => card.kind === "unit").length;
  const enemyAbilities = enemyCards.length - enemyUnits;
  const control = mission.controlObjective;

  return {
    mode: control ? "control" : "core",
    modeLabel: control ? "SIGNALKRIEG" : "CORE-ANGRIFF",
    difficultyLabel,
    playerTerritory: mission.owners.filter((owner) => owner === "player").length,
    enemyTerritory: mission.owners.filter((owner) => owner === "enemy").length,
    neutralTerritory: mission.owners.filter((owner) => owner === null).length,
    objective: objectiveDescription(mission),
    objectiveMeta: control
      ? `${control.requiredPoints}/${control.pointIds.length} RELAIS · ${control.seconds}s`
      : "CORE ZERSTÖREN",
    enemyCommander: mission.enemyCommander
      ? `${COMMANDERS[mission.enemyCommander].name} · ${COMMANDERS[mission.enemyCommander].ability}`
      : "STANDARDKOMMANDO",
    enemyAverageCost:
      enemyCards.length > 0
        ? enemyCards.reduce((sum, card) => sum + card.cost, 0) /
          enemyCards.length
        : 0,
    enemyUnits,
    enemyAbilities,
    starTargets: [
      "GEFECHT GEWINNEN",
      `≥ ${Math.round(mission.healthTarget * 100)}% CORE`,
      `≤ ${mission.speedTarget}s`,
    ],
  };
}
