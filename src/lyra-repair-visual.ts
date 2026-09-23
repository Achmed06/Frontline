import type { Effect } from "./engine";
import { COMMANDERS } from "./commanders";

export type LyraRepairVisual = {
  progress: number;
  alpha: number;
  unitRadius: number;
  healing: number;
  healingCap: number;
  healRatio: number;
  cleanse: boolean;
  strength: number;
  shellRadius: number;
  innerRadius: number;
  crossSize: number;
  nodeCount: number;
  nodeRadius: number;
  cleanseArcCount: number;
  shardCount: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function lyraRepairVisual(
  effect:
    | Pick<
        Effect,
        | "type"
        | "life"
        | "maxLife"
        | "radius"
        | "value"
        | "sourceCardId"
        | "cleanse"
      >
    | undefined,
): LyraRepairVisual | null {
  if (
    !effect ||
    effect.type !== "heal" ||
    effect.sourceCardId !== "lyra" ||
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
  const healingCap = COMMANDERS.lyra.healing;
  const healing =
    Number.isFinite(effect.value) && (effect.value ?? 0) >= 0
      ? Math.max(0, Math.min(healingCap, effect.value!))
      : 0;
  const healRatio = clamp01(healing / healingCap);
  const cleanse = effect.cleanse === true;
  const strength = clamp01(Math.max(healRatio, cleanse ? 0.75 : 0));
  const release = clamp01((1 - progress) / 0.8);
  const eased = 1 - Math.pow(1 - progress, 2.15);
  const shellBase = unitRadius + 9;

  return {
    progress,
    alpha: (0.24 + release * 0.76) * (0.78 + strength * 0.22),
    unitRadius,
    healing,
    healingCap,
    healRatio,
    cleanse,
    strength,
    shellRadius: shellBase + eased * 7,
    innerRadius: unitRadius + 4 + eased * 4,
    crossSize: 5 + healRatio * 5,
    nodeCount: 4 + Math.round(healRatio * 4),
    nodeRadius: shellBase * (0.62 + eased * 0.22),
    cleanseArcCount: cleanse ? 6 : 0,
    shardCount: cleanse ? 8 : 4 + Math.round(healRatio * 5),
  };
}
