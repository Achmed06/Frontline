import type { Effect } from "./engine";
import {
  CORE_CRITICAL_FRACTION,
  CORE_DAMAGED_FRACTION,
  corePressure,
  type CorePressureState,
} from "./core-pressure";

export type CoreClimaxCue =
  | "coreImpact"
  | "coreCriticalImpact"
  | "coreBreak"
  | "coreLost";

export type CoreImpactClimax = {
  state: CorePressureState;
  fraction: number;
  intensity: number;
  visualScale: number;
  cameraScale: number;
  ringAlpha: number;
  cue: "coreImpact" | "coreCriticalImpact" | null;
};

type CoreHitEffect = Pick<Effect, "type" | "team" | "radius" | "value">;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function coreImpactClimax(
  effect: CoreHitEffect | undefined,
  targetFraction: number,
): CoreImpactClimax | null {
  if (!effect || effect.type !== "core-hit") return null;

  const pressure = corePressure(targetFraction, 1);
  const fraction = pressure.fraction;
  const hitWeight =
    Number.isFinite(effect.radius) && (effect.radius ?? 0) > 0
      ? Math.max(10, Math.min(36, effect.radius ?? 18))
      : 18;
  const weight = clamp01((hitWeight - 10) / 26);

  if (pressure.state === "stable")
    return {
      state: pressure.state,
      fraction,
      intensity: 0.44 + weight * 0.16,
      visualScale: 1,
      cameraScale: 1,
      ringAlpha: 0,
      cue: null,
    };

  if (pressure.state === "damaged") {
    const stage = clamp01(
      (CORE_DAMAGED_FRACTION - fraction) /
        (CORE_DAMAGED_FRACTION - CORE_CRITICAL_FRACTION),
    );
    return {
      state: pressure.state,
      fraction,
      intensity: 0.58 + stage * 0.17 + weight * 0.12,
      visualScale: 1.08 + stage * 0.1,
      cameraScale: 1.08 + stage * 0.08,
      ringAlpha: 0.34 + stage * 0.16,
      cue: effect.team === "player" ? "coreImpact" : null,
    };
  }

  const criticalStage =
    pressure.state === "destroyed"
      ? 1
      : clamp01(
          (CORE_CRITICAL_FRACTION - fraction) /
            CORE_CRITICAL_FRACTION,
        );

  return {
    state: pressure.state,
    fraction,
    intensity: 0.8 + criticalStage * 0.12 + weight * 0.08,
    visualScale: 1.22 + criticalStage * 0.16,
    cameraScale: 1.16 + criticalStage * 0.14,
    ringAlpha: 0.56 + criticalStage * 0.18,
    cue: effect.team === "player" ? "coreCriticalImpact" : null,
  };
}

export function strongestCoreImpactClimax(
  effects: readonly CoreHitEffect[],
  enemyCoreFraction: number,
): CoreImpactClimax | null {
  let strongest: CoreImpactClimax | null = null;
  for (const effect of effects) {
    if (effect.team !== "player") continue;
    const climax = coreImpactClimax(effect, enemyCoreFraction);
    if (!climax?.cue) continue;
    if (!strongest || climax.intensity > strongest.intensity)
      strongest = climax;
  }
  return strongest;
}
