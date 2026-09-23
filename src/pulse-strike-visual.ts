import type { Effect } from "./engine";

export type PulseStrikeVisual = {
  progress: number;
  alpha: number;
  radius: number;
  innerRadius: number;
  shockRadius: number;
  secondaryRadius: number;
  coreRadius: number;
  spokeCount: number;
  spokeInner: number;
  spokeOuter: number;
  arcCount: number;
  intensity: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function pulseStrikeVisual(
  effect: Pick<
    Effect,
    "type" | "life" | "maxLife" | "radius" | "value" | "sourceCardId"
  > | undefined,
): PulseStrikeVisual | null {
  if (
    !effect ||
    effect.type !== "pulse" ||
    effect.sourceCardId !== "pulse" ||
    !Number.isFinite(effect.life) ||
    !Number.isFinite(effect.maxLife) ||
    effect.maxLife <= 0
  )
    return null;

  const progress = clamp01(1 - effect.life / effect.maxLife);
  const radius =
    Number.isFinite(effect.radius) && (effect.radius ?? 0) > 0
      ? Math.max(12, Math.min(140, effect.radius!))
      : 82;
  const damage =
    Number.isFinite(effect.value) && (effect.value ?? 0) > 0
      ? effect.value!
      : 85;
  const intensity = clamp01(damage / 85);
  const attack = clamp01(progress / 0.16);
  const release = clamp01((1 - progress) / 0.84);
  const eased = 1 - Math.pow(1 - progress, 2.35);

  return {
    progress,
    alpha: (0.22 + release * 0.78) * (0.72 + intensity * 0.28),
    radius,
    innerRadius: radius * (0.16 + eased * 0.34),
    shockRadius: radius * (0.08 + eased * 0.92),
    secondaryRadius: radius * (0.05 + eased * 0.72),
    coreRadius: 5 + attack * (7 + intensity * 3),
    spokeCount: 8,
    spokeInner: radius * (0.12 + eased * 0.18),
    spokeOuter: radius * (0.34 + eased * 0.54),
    arcCount: 4 + Math.round(intensity * 2),
    intensity,
  };
}
