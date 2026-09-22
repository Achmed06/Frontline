import type { Effect } from "./engine";

export type DeathBurstDirection = {
  active: boolean;
  nx: number;
  ny: number;
  bias: number;
  stretch: number;
  offset: number;
};

type DeathEffect = Pick<
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

export function deathBurstDirection(
  effect: DeathEffect | undefined,
): DeathBurstDirection {
  if (
    !effect ||
    effect.type !== "death" ||
    !Number.isFinite(effect.x) ||
    !Number.isFinite(effect.y) ||
    !Number.isFinite(effect.sourceX) ||
    !Number.isFinite(effect.sourceY)
  )
    return {
      active: false,
      nx: 0,
      ny: 0,
      bias: 0,
      stretch: 1,
      offset: 0,
    };

  const dx = effect.x - (effect.sourceX as number);
  const dy = effect.y - (effect.sourceY as number);
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance < 0.001)
    return {
      active: false,
      nx: 0,
      ny: 0,
      bias: 0,
      stretch: 1,
      offset: 0,
    };

  const maxLife =
    Number.isFinite(effect.maxLife) && effect.maxLife > 0
      ? effect.maxLife
      : 1;
  const life = Number.isFinite(effect.life)
    ? Math.max(0, Math.min(maxLife, effect.life))
    : 0;
  const lifetime = clamp01(life / maxLife);
  const radius =
    Number.isFinite(effect.radius) && (effect.radius ?? 0) > 0
      ? Math.max(12, Math.min(36, effect.radius ?? 18))
      : 18;
  const radiusFactor = clamp01((radius - 12) / 24);
  const bias = clamp01((0.38 + radiusFactor * 0.22) * lifetime);

  return {
    active: bias > 0,
    nx: dx / distance,
    ny: dy / distance,
    bias,
    stretch: 1 + bias * 0.34,
    offset: (2.5 + radius * 0.12) * bias,
  };
}
