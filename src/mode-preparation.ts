import { COMMANDERS } from "./commanders";
import { CARDS, type CardId } from "./engine";
import { SERIES_LIVES, type SeriesRun } from "./series";
import type { DailyChallenge, DailyRecord } from "./daily-front";

export type SeriesPreparation = {
  wins: number;
  losses: number;
  livesRemaining: number;
  battle: number;
  complete: boolean;
  failed: boolean;
  commander: string;
  deckAverageCost: number;
};

export function seriesPreparation(
  run: SeriesRun | null,
  fallbackDeck: readonly CardId[],
  fallbackCommander: keyof typeof COMMANDERS,
): SeriesPreparation {
  const sourceDeck = run?.deck ?? fallbackDeck;
  const commander = run?.commander ?? fallbackCommander;
  const wins = run?.wins ?? 0;
  const losses = run?.losses ?? 0;
  const complete = wins >= 3;
  const failed = losses >= SERIES_LIVES;
  return {
    wins,
    losses,
    livesRemaining: Math.max(0, SERIES_LIVES - losses),
    battle: Math.min(3, wins + 1),
    complete,
    failed,
    commander: COMMANDERS[commander].name,
    deckAverageCost: averageCost(sourceDeck),
  };
}

export type DailyPreparation = {
  mode: "core" | "control";
  modeLabel: string;
  objectiveMeta: string;
  playerTerritory: number;
  enemyTerritory: number;
  neutralTerritory: number;
  playerCommander: string;
  enemyCommander: string;
  playerAverageCost: number;
  enemyAverageCost: number;
  attempts: number;
  complete: boolean;
};

export function dailyPreparation(
  challenge: DailyChallenge,
  record: DailyRecord | null,
): DailyPreparation {
  const control = challenge.controlObjective;
  return {
    mode: control ? "control" : "core",
    modeLabel: control ? "SIGNALKRIEG" : "CORE-ANGRIFF",
    objectiveMeta: control
      ? `${control.requiredPoints}/${control.pointIds.length} RELAIS · ${control.seconds}s`
      : "CORE ZERSTÖREN",
    playerTerritory: challenge.owners.filter((owner) => owner === "player").length,
    enemyTerritory: challenge.owners.filter((owner) => owner === "enemy").length,
    neutralTerritory: challenge.owners.filter((owner) => owner === null).length,
    playerCommander: COMMANDERS[challenge.playerCommander].name,
    enemyCommander: COMMANDERS[challenge.enemyCommander].name,
    playerAverageCost: averageCost(challenge.playerDeck),
    enemyAverageCost: averageCost(challenge.enemyDeck),
    attempts: record?.attempts ?? 0,
    complete: Boolean(record?.completed),
  };
}

export type DraftPreparation = {
  picked: number;
  unitCount: number;
  abilityCount: number;
  phase: "units" | "abilities" | "ready";
  phaseLabel: string;
  nextSlot: string;
};

export function draftPreparation(picks: readonly CardId[]): DraftPreparation {
  const cards = picks
    .map((id) => CARDS.find((card) => card.id === id))
    .filter((card): card is (typeof CARDS)[number] => Boolean(card));
  const unitCount = cards.filter((card) => card.kind === "unit").length;
  const abilityCount = cards.filter((card) => card.kind === "ability").length;
  const ready = unitCount === 6 && abilityCount === 2;
  const phase = ready ? "ready" : unitCount < 6 ? "units" : "abilities";
  return {
    picked: Math.min(8, cards.length),
    unitCount,
    abilityCount,
    phase,
    phaseLabel:
      phase === "ready"
        ? "EINSATZBEREIT"
        : phase === "units"
          ? "TRUPPEN AUFSTELLEN"
          : "TAKTIK FESTLEGEN",
    nextSlot:
      phase === "ready"
        ? "8/8 KARTEN"
        : phase === "units"
          ? `EINHEIT ${unitCount + 1}/6`
          : `TAKTIK ${abilityCount + 1}/2`,
  };
}

function averageCost(deck: readonly CardId[]): number {
  const cards = deck
    .map((id) => CARDS.find((card) => card.id === id))
    .filter((card): card is (typeof CARDS)[number] => Boolean(card));
  if (!cards.length) return 0;
  return cards.reduce((sum, card) => sum + card.cost, 0) / cards.length;
}
