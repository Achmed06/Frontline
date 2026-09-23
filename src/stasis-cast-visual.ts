import type { Effect } from "./engine";

export type StasisCastVisual = {
  progress: number;
  alpha: number;
  radius: number;
  slowFactor: number;
  severity: number;
  boundaryRadius: number;
  latticeRadius: number;
  innerRadius: number;
  nodeRadius: number;
  spokeCount: number;
  nodeCount: number;
  shardCount: number;
  bracketReach: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function stasisCastVisual(
  effect:
    | Pick<
        Effect,
        "type" | "life" | "maxLife" | "radius" | "value" | "sourceCardId"
      >
    | undefined,
): StasisCastVisual | null {
  if (
    !effect ||
    effect.type !== "stasis" ||
    effect.sourceCardId !== "stasis" ||
    !Number.isFinite(effect.life) ||
    !Number.isFinite(effect.maxLife) ||
    effect.maxLife <= 0
  )
    return null;

  const progress = clamp01(1 - effect.life / effect.maxLife);
  const radius =
    Number.isFinite(effect.radius) && (effect.radius ?? 0) > 0
      ? Math.max(24, Math.min(140, effect.radius!))
      : 78;
  const slowFactor =
    Number.isFinite(effect.value) && (effect.value ?? 0) > 0
      ? Math.max(0.2, Math.min(1, effect.value!))
      : 0.6;
  const severity = clamp01((1 - slowFactor) / 0.4);
  const attack = clamp01(progress / 0.16);
  const release = clamp01((1 - progress) / 0.84);
  const eased = 1 - Math.pow(1 - progress, 2.3);

  return {
    progress,
    alpha: (0.24 + release * 0.76) * (0.76 + severity * 0.24),
    radius,
    slowFactor,
    severity,
    boundaryRadius: radius,
    latticeRadius: radius * (0.16 + eased * 0.78),
    innerRadius: radius * (0.08 + eased * 0.34),
    nodeRadius: radius * (0.2 + eased * 0.58),
    spokeCount: 6,
    nodeCount: 6,
    shardCount: 6 + Math.round(severity * 6),
    bracketReach: 5 + attack * (5 + severity * 3),
  };
}
