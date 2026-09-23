import type { Effect } from "./engine";
import {
  TEMPO_ATTACK_SPEED_MULTIPLIER,
  TEMPO_MOVE_SPEED_MULTIPLIER,
} from "./tempo";

export type RallyCastVisual = {
  progress: number;
  alpha: number;
  radius: number;
  healing: number;
  intensity: number;
  outerRadius: number;
  innerRadius: number;
  surgeRadius: number;
  nodeCount: number;
  nodeRadius: number;
  chevronSpread: number;
  crossSize: number;
  moveMultiplier: number;
  attackMultiplier: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function rallyCastVisual(
  effect:
    | Pick<
        Effect,
        "type" | "life" | "maxLife" | "radius" | "value" | "sourceCardId"
      >
    | undefined,
): RallyCastVisual | null {
  if (
    !effect ||
    effect.type !== "rally" ||
    effect.sourceCardId !== "rally" ||
    !Number.isFinite(effect.life) ||
    !Number.isFinite(effect.maxLife) ||
    effect.maxLife <= 0
  )
    return null;

  const progress = clamp01(1 - effect.life / effect.maxLife);
  const radius =
    Number.isFinite(effect.radius) && (effect.radius ?? 0) > 0
      ? Math.max(24, Math.min(140, effect.radius!))
      : 96;
  const healing =
    Number.isFinite(effect.value) && (effect.value ?? 0) > 0
      ? Math.max(1, effect.value!)
      : 65;
  const intensity = clamp01(healing / 65);
  const release = clamp01((1 - progress) / 0.82);
  const attack = clamp01(progress / 0.18);
  const eased = 1 - Math.pow(1 - progress, 2.2);

  return {
    progress,
    alpha: (0.2 + release * 0.8) * (0.74 + intensity * 0.26),
    radius,
    healing,
    intensity,
    outerRadius: radius * (0.18 + eased * 0.82),
    innerRadius: radius * (0.1 + eased * 0.42),
    surgeRadius: radius * (0.08 + eased * 0.64),
    nodeCount: 8,
    nodeRadius: radius * (0.24 + eased * 0.54),
    chevronSpread: 12 + intensity * 8,
    crossSize: 5 + attack * (5 + intensity * 2),
    moveMultiplier: TEMPO_MOVE_SPEED_MULTIPLIER,
    attackMultiplier: TEMPO_ATTACK_SPEED_MULTIPLIER,
  };
}
