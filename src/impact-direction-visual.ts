import type { Effect } from "./engine";

export type ImpactDirectionVisual = {
  active: boolean;
  nx: number;
  ny: number;
  px: number;
  py: number;
  intensity: number;
  bias: number;
  contactOffset: number;
  wakeLength: number;
};

type ImpactEffect = Pick<
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

const neutral = (): ImpactDirectionVisual => ({
  active: false,
  nx: 0,
  ny: 0,
  px: 0,
  py: 0,
  intensity: 0,
  bias: 0,
  contactOffset: 0,
  wakeLength: 0,
});

export function impactDirectionVisual(
  effect: ImpactEffect | undefined,
): ImpactDirectionVisual {
  if (
    !effect ||
    effect.type !== "impact" ||
    !Number.isFinite(effect.x) ||
    !Number.isFinite(effect.y) ||
    !Number.isFinite(effect.sourceX) ||
    !Number.isFinite(effect.sourceY)
  )
    return neutral();

  const dx = effect.x - (effect.sourceX as number);
  const dy = effect.y - (effect.sourceY as number);
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance < 0.001) return neutral();

  const maxLife =
    Number.isFinite(effect.maxLife) && effect.maxLife > 0
      ? effect.maxLife
      : 1;
  const life = Number.isFinite(effect.life)
    ? Math.max(0, Math.min(maxLife, effect.life))
    : 0;
  const intensity = clamp01(life / maxLife);
  if (intensity <= 0) return neutral();

  const radius =
    Number.isFinite(effect.radius) && (effect.radius ?? 0) > 0
      ? Math.max(7, Math.min(20, effect.radius ?? 10))
      : 10;
  const radiusFactor = clamp01((radius - 7) / 13);
  const nx = dx / distance;
  const ny = dy / distance;
  const bias =
    (0.34 + radiusFactor * 0.24) *
    (0.72 + intensity * 0.28);

  return {
    active: true,
    nx,
    ny,
    px: -ny,
    py: nx,
    intensity,
    bias: clamp01(bias),
    contactOffset: 3.5 + radius * 0.24,
    wakeLength: 6 + radius * (0.42 + radiusFactor * 0.18),
  };
}
