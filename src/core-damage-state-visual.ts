import {
  CORE_CRITICAL_FRACTION,
  CORE_DAMAGED_FRACTION,
  type CorePressureState,
} from "./core-pressure";

export type CoreDamageStateVisual = {
  state: CorePressureState;
  fraction: number;
  damage: number;
  exposedSeams: number;
  ventCount: number;
  sparkCount: number;
  armorGap: number;
  conduitAlpha: number;
  ventAlpha: number;
  warningAlpha: number;
  debrisCount: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function coreDamageStateVisual(
  fraction: number,
): CoreDamageStateVisual {
  const safeFraction = Number.isFinite(fraction)
    ? clamp01(fraction)
    : 1;
  const state: CorePressureState =
    safeFraction <= 0
      ? "destroyed"
      : safeFraction <= CORE_CRITICAL_FRACTION
        ? "critical"
        : safeFraction <= CORE_DAMAGED_FRACTION
          ? "damaged"
          : "stable";
  const damage = clamp01(1 - safeFraction);

  if (state === "stable")
    return {
      state,
      fraction: safeFraction,
      damage,
      exposedSeams: 0,
      ventCount: 0,
      sparkCount: 0,
      armorGap: 0,
      conduitAlpha: 0,
      ventAlpha: 0,
      warningAlpha: 0,
      debrisCount: 0,
    };

  if (state === "damaged") {
    const stage = clamp01(
      (CORE_DAMAGED_FRACTION - safeFraction) /
        (CORE_DAMAGED_FRACTION - CORE_CRITICAL_FRACTION),
    );
    return {
      state,
      fraction: safeFraction,
      damage,
      exposedSeams: 2 + Math.round(stage * 2),
      ventCount: 1 + Math.round(stage),
      sparkCount: 1 + Math.round(stage * 2),
      armorGap: 2 + stage * 3,
      conduitAlpha: 0.28 + stage * 0.24,
      ventAlpha: 0.24 + stage * 0.24,
      warningAlpha: 0.34 + stage * 0.2,
      debrisCount: 1 + Math.round(stage * 2),
    };
  }

  const criticalStage =
    state === "destroyed"
      ? 1
      : clamp01(
          (CORE_CRITICAL_FRACTION - safeFraction) /
            CORE_CRITICAL_FRACTION,
        );

  return {
    state,
    fraction: safeFraction,
    damage,
    exposedSeams: 5 + Math.round(criticalStage * 2),
    ventCount: 3 + Math.round(criticalStage * 2),
    sparkCount: 4 + Math.round(criticalStage * 3),
    armorGap: 6 + criticalStage * 4,
    conduitAlpha: 0.62 + criticalStage * 0.24,
    ventAlpha: 0.58 + criticalStage * 0.28,
    warningAlpha: 0.7 + criticalStage * 0.24,
    debrisCount: 4 + Math.round(criticalStage * 3),
  };
}
