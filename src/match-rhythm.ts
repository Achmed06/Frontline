import { MATCH_DURATION, type MatchState } from "./engine";

export type MatchRhythmStage =
  | "opening"
  | "battle"
  | "pressure"
  | "climax";

export type MatchRhythmVisual = {
  stage: MatchRhythmStage;
  intensity: number;
  pulseRate: number;
  edgeAlpha: number;
  gridAlpha: number;
  neutralTip: string;
};

type RhythmState = Pick<
  MatchState,
  "time" | "phase" | "units" | "points" | "cores"
>;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function matchRhythm(state: RhythmState): MatchRhythmVisual {
  const time = Number.isFinite(state.time) ? Math.max(0, state.time) : 0;
  const timeProgress = clamp01(time / MATCH_DURATION);
  const playerCoreFraction = clamp01(
    state.cores.player.hp / Math.max(1, state.cores.player.maxHp),
  );
  const enemyCoreFraction = clamp01(
    state.cores.enemy.hp / Math.max(1, state.cores.enemy.maxHp),
  );
  const lowestCore = Math.min(playerCoreFraction, enemyCoreFraction);
  const corePressure = clamp01(1 - lowestCore);
  const contested = state.points.filter((point) => point.contested).length;
  const contestedPressure = clamp01(contested / 3);
  const unitPressure = clamp01(state.units.length / 12);

  const stage: MatchRhythmStage =
    state.phase === "overtime" ||
    time >= MATCH_DURATION - 30 ||
    lowestCore <= 0.3
      ? "climax"
      : time >= 120 || lowestCore <= 0.6
        ? "pressure"
        : time >= 35
          ? "battle"
          : "opening";

  const stageFloor =
    stage === "opening"
      ? 0.16
      : stage === "battle"
        ? 0.3
        : stage === "pressure"
          ? 0.48
          : 0.68;

  const intensity = clamp01(
    Math.max(
      stageFloor,
      0.12 +
        timeProgress * 0.28 +
        unitPressure * 0.2 +
        contestedPressure * 0.22 +
        corePressure * 0.26,
    ),
  );

  return {
    stage,
    intensity,
    pulseRate:
      stage === "opening"
        ? 1.3
        : stage === "battle"
          ? 1.9
          : stage === "pressure"
            ? 2.7
            : 3.6,
    edgeAlpha:
      stage === "opening"
        ? 0.018
        : 0.018 + intensity * (stage === "climax" ? 0.055 : 0.038),
    gridAlpha: 0.026 + intensity * 0.022,
    neutralTip:
      stage === "opening"
        ? "EROBERE DIE MITTE"
        : stage === "battle"
          ? "FRONT WEITER VORSCHIEBEN"
          : stage === "pressure"
            ? "NÄCHSTEN PUNKT SICHERN"
            : "JETZT ENTSCHEIDET DIE FRONT",
  };
}
