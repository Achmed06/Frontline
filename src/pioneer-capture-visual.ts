import type { Effect } from "./engine";

export type PioneerCaptureVisual = {
  progress: number;
  alpha: number;
  radius: number;
  multiplier: number;
  bonus: number;
  innerRadius: number;
  outerRadius: number;
  chevronCount: number;
  chevronReach: number;
  nodeCount: number;
  nodeRadius: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function pioneerCaptureVisual(
  effect: Pick<
    Effect,
    "type" | "life" | "maxLife" | "radius" | "value"
  > | undefined,
): PioneerCaptureVisual | null {
  if (
    !effect ||
    effect.type !== "pioneer" ||
    !Number.isFinite(effect.life) ||
    !Number.isFinite(effect.maxLife) ||
    effect.maxLife <= 0
  )
    return null;

  const progress = clamp01(1 - effect.life / effect.maxLife);
  const radius =
    Number.isFinite(effect.radius) && effect.radius! > 0
      ? Math.max(18, Math.min(90, effect.radius!))
      : 48;
  const multiplier =
    Number.isFinite(effect.value) && effect.value! > 1
      ? Math.max(1, Math.min(3, effect.value!))
      : 1.5;
  const bonus = clamp01((multiplier - 1) / 0.5);
  const release = 1 - progress;
  const eased = 1 - Math.pow(release, 2.1);

  return {
    progress,
    alpha: (0.3 + release * 0.7) * (0.76 + bonus * 0.24),
    radius,
    multiplier,
    bonus,
    innerRadius: radius * (0.2 + eased * 0.42),
    outerRadius: radius * (0.35 + eased * 0.65),
    chevronCount: 3 + Math.round(bonus * 2),
    chevronReach: 7 + bonus * 5,
    nodeCount: 6,
    nodeRadius: radius * (0.52 + eased * 0.35),
  };
}
