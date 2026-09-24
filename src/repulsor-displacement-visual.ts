import type { Effect } from "./engine";

export type RepulsorDisplacementVisual = {
  active: boolean;
  progress: number;
  alpha: number;
  nx: number;
  ny: number;
  px: number;
  py: number;
  distance: number;
  trailWidth: number;
  streakCount: number;
  landingRadius: number;
  shockLength: number;
  travelProgress: number;
};

type RepulsorMoveEffect = Pick<
  Effect,
  | "type"
  | "x"
  | "y"
  | "targetX"
  | "targetY"
  | "life"
  | "maxLife"
  | "radius"
  | "value"
>;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function repulsorDisplacementVisual(
  effect: RepulsorMoveEffect | undefined,
): RepulsorDisplacementVisual | null {
  if (
    !effect ||
    effect.type !== "repulsor-move" ||
    !Number.isFinite(effect.x) ||
    !Number.isFinite(effect.y) ||
    !Number.isFinite(effect.targetX) ||
    !Number.isFinite(effect.targetY)
  )
    return null;

  const dx = (effect.targetX as number) - effect.x;
  const dy = (effect.targetY as number) - effect.y;
  const actualDistance = Math.hypot(dx, dy);
  if (!Number.isFinite(actualDistance) || actualDistance < 0.001) return null;

  const maxLife =
    Number.isFinite(effect.maxLife) && effect.maxLife > 0
      ? effect.maxLife
      : 1;
  const life = Number.isFinite(effect.life)
    ? Math.max(0, Math.min(maxLife, effect.life))
    : 0;
  const alpha = clamp01(life / maxLife);
  const progress = clamp01(1 - alpha);
  const reportedDistance =
    Number.isFinite(effect.value) && (effect.value ?? 0) > 0
      ? effect.value ?? actualDistance
      : actualDistance;
  const distance = Math.max(1, Math.min(80, reportedDistance));
  const radius =
    Number.isFinite(effect.radius) && (effect.radius ?? 0) > 0
      ? Math.max(6, Math.min(18, effect.radius ?? 9))
      : 9;
  const strength = clamp01(distance / 55);
  const nx = dx / actualDistance;
  const ny = dy / actualDistance;
  const travelProgress = clamp01(progress * 1.55);

  return {
    active: alpha > 0,
    progress,
    alpha,
    nx,
    ny,
    px: -ny,
    py: nx,
    distance,
    trailWidth: 5 + radius * 0.55 + strength * 4,
    streakCount: 3 + Math.round(strength * 3),
    landingRadius: radius + 5 + strength * 7,
    shockLength: 8 + strength * 10,
    travelProgress,
  };
}

export function repulsorDisplacementPoint(
  effect: RepulsorMoveEffect | undefined,
  snap = false,
): { x: number; y: number; progress: number } | null {
  const visual = repulsorDisplacementVisual(effect);
  if (!visual || !effect?.targetX || !effect?.targetY) return null;
  const progress = snap ? 1 : visual.travelProgress;
  return {
    x: effect.x + (effect.targetX - effect.x) * progress,
    y: effect.y + (effect.targetY - effect.y) * progress,
    progress,
  };
}
