import type { Effect } from "./engine";

export type StasisHitVisual = {
  progress: number;
  alpha: number;
  severity: number;
  directional: boolean;
  nx: number;
  ny: number;
  px: number;
  py: number;
  shellRadius: number;
  innerRadius: number;
  bracketReach: number;
  tetherProgress: number;
  shardCount: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function stasisHitVisual(
  effect: Pick<
    Effect,
    | "type"
    | "life"
    | "maxLife"
    | "radius"
    | "value"
    | "sourceCardId"
    | "x"
    | "y"
    | "sourceX"
    | "sourceY"
  > | undefined,
): StasisHitVisual | null {
  if (
    !effect ||
    effect.type !== "stasis-hit" ||
    effect.sourceCardId !== "stasis" ||
    !Number.isFinite(effect.life) ||
    !Number.isFinite(effect.maxLife) ||
    effect.maxLife <= 0
  )
    return null;

  const progress = clamp01(1 - effect.life / effect.maxLife);
  const factor =
    Number.isFinite(effect.value) && effect.value! >= 0
      ? Math.max(0, Math.min(1, effect.value!))
      : 1;
  const severity = clamp01(1 - factor);
  const radius =
    Number.isFinite(effect.radius) && effect.radius! > 0
      ? Math.max(5, Math.min(24, effect.radius!))
      : 9;
  const release = 1 - progress;
  const dx =
    Number.isFinite(effect.sourceX) && Number.isFinite(effect.x)
      ? effect.x - effect.sourceX!
      : 0;
  const dy =
    Number.isFinite(effect.sourceY) && Number.isFinite(effect.y)
      ? effect.y - effect.sourceY!
      : 0;
  const length = Math.hypot(dx, dy);
  const directional = length > 0.001;
  const nx = directional ? dx / length : 0;
  const ny = directional ? dy / length : -1;

  return {
    progress,
    alpha: (0.34 + release * 0.66) * (0.7 + severity * 0.3),
    severity,
    directional,
    nx,
    ny,
    px: -ny,
    py: nx,
    shellRadius: radius + 5 + release * (13 + severity * 8),
    innerRadius: radius + 2 + release * 4,
    bracketReach: 4 + severity * 5 + release * 3,
    tetherProgress: clamp01(progress / 0.42),
    shardCount: 4 + Math.round(severity * 5),
  };
}
