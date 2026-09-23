import type { Effect } from "./engine";
import { CAPTURE_RADIUS, CAPTURE_SECONDS } from "./engine";

export type ControlPointSecureVisual = {
  progress: number;
  alpha: number;
  radius: number;
  captureSeconds: number;
  boundaryRadius: number;
  secureRadius: number;
  innerRadius: number;
  nodeCount: number;
  nodeRadius: number;
  chevronCount: number;
  chevronReach: number;
  lockReach: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function controlPointSecureVisual(
  effect:
    | Pick<
        Effect,
        "type" | "life" | "maxLife" | "radius" | "value" | "sourceCardId"
      >
    | undefined,
): ControlPointSecureVisual | null {
  if (
    !effect ||
    effect.type !== "capture" ||
    effect.sourceCardId !== "control-point" ||
    !Number.isFinite(effect.life) ||
    !Number.isFinite(effect.maxLife) ||
    effect.maxLife <= 0
  )
    return null;

  const progress = clamp01(1 - effect.life / effect.maxLife);
  const radius =
    Number.isFinite(effect.radius) && (effect.radius ?? 0) > 0
      ? Math.max(24, Math.min(96, effect.radius!))
      : CAPTURE_RADIUS;
  const captureSeconds =
    Number.isFinite(effect.value) && (effect.value ?? 0) > 0
      ? Math.max(0.5, Math.min(20, effect.value!))
      : CAPTURE_SECONDS;
  const release = clamp01((1 - progress) / 0.82);
  const eased = 1 - Math.pow(1 - progress, 2.2);

  return {
    progress,
    alpha: 0.2 + release * 0.8,
    radius,
    captureSeconds,
    boundaryRadius: radius,
    secureRadius: radius * (0.16 + eased * 0.84),
    innerRadius: radius * (0.1 + eased * 0.38),
    nodeCount: 6,
    nodeRadius: radius * (0.32 + eased * 0.42),
    chevronCount: 3,
    chevronReach: 7 + eased * 5,
    lockReach: 6 + eased * 4,
  };
}
