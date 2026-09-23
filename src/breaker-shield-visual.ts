import type { Effect } from "./engine";

export type BreakerShieldVisual = {
  progress: number;
  alpha: number;
  strength: number;
  removedShield: number;
  directional: boolean;
  nx: number;
  ny: number;
  px: number;
  py: number;
  waveScale: number;
  slashReach: number;
  crossReach: number;
  fragmentCount: number;
};

type BreakerEffect = Pick<
  Effect,
  | "type"
  | "x"
  | "y"
  | "life"
  | "maxLife"
  | "value"
  | "sourceX"
  | "sourceY"
>;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function breakerShieldVisual(
  effect: BreakerEffect | undefined,
): BreakerShieldVisual | null {
  if (!effect || effect.type !== "breaker") return null;

  const maxLife =
    Number.isFinite(effect.maxLife) && effect.maxLife > 0
      ? effect.maxLife
      : 1;
  const life = Number.isFinite(effect.life)
    ? Math.max(0, Math.min(maxLife, effect.life))
    : 0;
  const alpha = clamp01(life / maxLife);
  const progress = clamp01(1 - alpha);
  const removedShield =
    Number.isFinite(effect.value) && (effect.value ?? 0) > 0
      ? Math.max(1, Math.min(45, effect.value ?? 1))
      : 1;
  const strength = clamp01(removedShield / 45);

  let nx = 0;
  let ny = 0;
  let directional = false;
  if (
    Number.isFinite(effect.sourceX) &&
    Number.isFinite(effect.sourceY) &&
    Number.isFinite(effect.x) &&
    Number.isFinite(effect.y)
  ) {
    const dx = effect.x - (effect.sourceX as number);
    const dy = effect.y - (effect.sourceY as number);
    const distance = Math.hypot(dx, dy);
    if (Number.isFinite(distance) && distance > 0.001) {
      nx = dx / distance;
      ny = dy / distance;
      directional = true;
    }
  }

  return {
    progress,
    alpha,
    strength,
    removedShield,
    directional,
    nx,
    ny,
    px: -ny,
    py: nx,
    waveScale: 0.9 + strength * 0.25,
    slashReach: 8 + strength * 8,
    crossReach: 5 + strength * 6,
    fragmentCount: 2 + Math.round(strength * 4),
  };
}
