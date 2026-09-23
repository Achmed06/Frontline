import type { Effect } from "./engine";
import { COMMANDERS } from "./commanders";

export type NovaTempoActivationVisual = {
  progress: number;
  alpha: number;
  unitRadius: number;
  duration: number;
  moveMultiplier: number;
  attackMultiplier: number;
  moveBoost: number;
  attackBoost: number;
  strength: number;
  shellRadius: number;
  surgeRadius: number;
  chevronCount: number;
  tickCount: number;
  chevronReach: number;
  tickLength: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function novaTempoActivationVisual(
  effect:
    | Pick<
        Effect,
        "type" | "life" | "maxLife" | "radius" | "value" | "sourceCardId"
      >
    | undefined,
): NovaTempoActivationVisual | null {
  if (
    !effect ||
    effect.type !== "rally" ||
    effect.sourceCardId !== "nova" ||
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
  const duration =
    Number.isFinite(effect.value) && (effect.value ?? 0) > 0
      ? Math.max(0.5, Math.min(20, effect.value!))
      : COMMANDERS.nova.duration;
  const moveMultiplier = COMMANDERS.nova.moveSpeedMultiplier;
  const attackMultiplier = COMMANDERS.nova.attackSpeedMultiplier;
  const moveBoost = Math.max(0, moveMultiplier - 1);
  const attackBoost = Math.max(0, attackMultiplier - 1);
  const strength = clamp01(Math.max(moveBoost / 0.25, attackBoost / 0.3));
  const release = clamp01((1 - progress) / 0.78);
  const eased = 1 - Math.pow(1 - progress, 2.35);
  const shellBase = unitRadius + 8;

  return {
    progress,
    alpha: (0.24 + release * 0.76) * (0.82 + strength * 0.18),
    unitRadius,
    duration,
    moveMultiplier,
    attackMultiplier,
    moveBoost,
    attackBoost,
    strength,
    shellRadius: shellBase + eased * 7,
    surgeRadius: unitRadius + 4 + eased * 8,
    chevronCount: 3 + Math.round(moveBoost / 0.125),
    tickCount: 5 + Math.round(attackBoost / 0.1),
    chevronReach: 5 + strength * 5,
    tickLength: 3.5 + strength * 3.5,
  };
}
