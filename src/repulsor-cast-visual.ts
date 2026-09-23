import type { Effect } from "./engine";

export type RepulsorCastVisual = {
  progress: number;
  alpha: number;
  radius: number;
  pushDistance: number;
  strength: number;
  boundaryRadius: number;
  waveRadius: number;
  innerRadius: number;
  spokeCount: number;
  arrowLength: number;
  arrowWidth: number;
  ringGap: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function repulsorCastVisual(
  effect:
    | Pick<
        Effect,
        "type" | "life" | "maxLife" | "radius" | "value" | "sourceCardId"
      >
    | undefined,
): RepulsorCastVisual | null {
  if (
    !effect ||
    effect.type !== "repulsor" ||
    effect.sourceCardId !== "repulsor" ||
    !Number.isFinite(effect.life) ||
    !Number.isFinite(effect.maxLife) ||
    effect.maxLife <= 0
  )
    return null;

  const progress = clamp01(1 - effect.life / effect.maxLife);
  const radius =
    Number.isFinite(effect.radius) && (effect.radius ?? 0) > 0
      ? Math.max(24, Math.min(140, effect.radius!))
      : 72;
  const pushDistance =
    Number.isFinite(effect.value) && (effect.value ?? 0) > 0
      ? Math.max(1, Math.min(100, effect.value!))
      : 55;
  const strength = clamp01(pushDistance / 55);
  const release = clamp01((1 - progress) / 0.82);
  const eased = 1 - Math.pow(1 - progress, 2.25);

  return {
    progress,
    alpha: (0.22 + release * 0.78) * (0.74 + strength * 0.26),
    radius,
    pushDistance,
    strength,
    boundaryRadius: radius,
    waveRadius: radius * (0.12 + eased * 0.88),
    innerRadius: radius * (0.08 + eased * 0.34),
    spokeCount: 8,
    arrowLength: 8 + strength * 7,
    arrowWidth: 3.5 + strength * 2.5,
    ringGap: 5 + strength * 4,
  };
}
