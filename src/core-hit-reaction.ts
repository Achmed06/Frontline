import type { Effect } from "./engine";

export type CoreHitReaction = {
  active: boolean;
  nx: number;
  ny: number;
  intensity: number;
  rimRadius: number;
  sparkLength: number;
  arcWidth: number;
};

type CoreHitEffect = Pick<
  Effect,
  | "type"
  | "x"
  | "y"
  | "life"
  | "maxLife"
  | "radius"
  | "sourceX"
  | "sourceY"
>;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const neutral = (): CoreHitReaction => ({
  active: false,
  nx: 0,
  ny: 0,
  intensity: 0,
  rimRadius: 24,
  sparkLength: 0,
  arcWidth: 0,
});

export function coreHitReaction(
  effect: CoreHitEffect | undefined,
): CoreHitReaction {
  if (
    !effect ||
    effect.type !== "core-hit" ||
    !Number.isFinite(effect.sourceX) ||
    !Number.isFinite(effect.sourceY) ||
    !Number.isFinite(effect.x) ||
    !Number.isFinite(effect.y)
  )
    return neutral();

  const dx = (effect.sourceX as number) - effect.x;
  const dy = (effect.sourceY as number) - effect.y;
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance < 0.001) return neutral();

  const maxLife =
    Number.isFinite(effect.maxLife) && effect.maxLife > 0
      ? effect.maxLife
      : 1;
  const life = Number.isFinite(effect.life)
    ? Math.max(0, Math.min(maxLife, effect.life))
    : 0;
  const lifetime = clamp01(life / maxLife);
  const weight =
    Number.isFinite(effect.radius) && (effect.radius ?? 0) > 0
      ? Math.max(8, Math.min(36, effect.radius ?? 18))
      : 18;
  const weightFactor = clamp01((weight - 8) / 28);
  const intensity = clamp01(lifetime * (0.58 + weightFactor * 0.42));

  return {
    active: intensity > 0,
    nx: dx / distance,
    ny: dy / distance,
    intensity,
    rimRadius: 23 + weight * 0.16,
    sparkLength: 7 + weight * 0.24,
    arcWidth: 0.42 + weightFactor * 0.24,
  };
}
