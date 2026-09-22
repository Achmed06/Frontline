import type { Effect } from "./engine";

export type UnitHitReaction = {
  offsetX: number;
  offsetY: number;
  angle: number;
  widthScale: number;
  heightScale: number;
  intensity: number;
};

type ImpactEffect = Pick<
  Effect,
  | "type"
  | "x"
  | "y"
  | "sourceX"
  | "sourceY"
  | "life"
  | "maxLife"
  | "radius"
>;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function unitHitReaction(
  effect: ImpactEffect | undefined,
): UnitHitReaction {
  const neutral: UnitHitReaction = {
    offsetX: 0,
    offsetY: 0,
    angle: 0,
    widthScale: 1,
    heightScale: 1,
    intensity: 0,
  };
  if (
    !effect ||
    effect.type !== "impact" ||
    !Number.isFinite(effect.sourceX) ||
    !Number.isFinite(effect.sourceY)
  )
    return neutral;

  const maxLife =
    Number.isFinite(effect.maxLife) && effect.maxLife > 0
      ? effect.maxLife
      : 1;
  const life = Number.isFinite(effect.life)
    ? Math.max(0, Math.min(maxLife, effect.life))
    : 0;
  const lifetime = clamp01(life / maxLife);
  const weight = clamp01(
    (Number.isFinite(effect.radius) ? effect.radius ?? 9 : 9) / 18,
  );
  const intensity = clamp01(lifetime * (0.42 + weight * 0.58));

  const dx = effect.x - effect.sourceX!;
  const dy = effect.y - effect.sourceY!;
  const distance = Math.hypot(dx, dy);
  const nx = distance > 0.001 ? dx / distance : 0;
  const ny = distance > 0.001 ? dy / distance : 0;
  const travel = 1.4 + weight * 3.8;

  return {
    offsetX: nx * travel * intensity,
    offsetY: ny * travel * intensity,
    angle: nx * 3.2 * intensity,
    widthScale: 1 + intensity * 0.055,
    heightScale: 1 - intensity * 0.032,
    intensity,
  };
}
