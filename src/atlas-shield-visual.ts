import type { Effect } from "./engine";
import { COMMANDERS } from "./commanders";

export type AtlasShieldVisual = {
  progress: number;
  alpha: number;
  unitRadius: number;
  shieldCap: number;
  duration: number;
  shieldGain: number;
  gainRatio: number;
  refresh: boolean;
  shellRadius: number;
  innerRadius: number;
  plateRadius: number;
  plateCount: number;
  sparkCount: number;
  lockReach: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function atlasShieldVisual(
  effect:
    | Pick<
        Effect,
        "type" | "life" | "maxLife" | "radius" | "value" | "sourceCardId"
      >
    | undefined,
): AtlasShieldVisual | null {
  if (
    !effect ||
    effect.type !== "shield" ||
    effect.sourceCardId !== "atlas" ||
    !Number.isFinite(effect.life) ||
    !Number.isFinite(effect.maxLife) ||
    effect.maxLife <= 0
  )
    return null;

  const progress = clamp01(1 - effect.life / effect.maxLife);
  const unitRadius =
    Number.isFinite(effect.radius) && (effect.radius ?? 0) > 0
      ? Math.max(5, Math.min(24, effect.radius!))
      : 9;
  const shieldCap = COMMANDERS.atlas.shield;
  const duration = COMMANDERS.atlas.duration;
  const shieldGain =
    Number.isFinite(effect.value) && (effect.value ?? 0) >= 0
      ? Math.max(0, Math.min(shieldCap, effect.value!))
      : shieldCap;
  const gainRatio = clamp01(shieldGain / shieldCap);
  const refresh = shieldGain <= 0.001;
  const lock = clamp01(progress / 0.24);
  const release = clamp01((1 - progress) / 0.76);
  const eased = 1 - Math.pow(1 - progress, 2.2);
  const shellBase = unitRadius + 10;

  return {
    progress,
    alpha: (0.25 + release * 0.75) * (refresh ? 0.84 : 0.92 + gainRatio * 0.08),
    unitRadius,
    shieldCap,
    duration,
    shieldGain,
    gainRatio,
    refresh,
    shellRadius: shellBase + eased * 5,
    innerRadius: unitRadius + 4 + eased * 3,
    plateRadius: shellBase * (0.68 + lock * 0.22),
    plateCount: 6,
    sparkCount: refresh ? 6 : 6 + Math.round(gainRatio * 6),
    lockReach: 4 + lock * (4 + gainRatio * 3),
  };
}
