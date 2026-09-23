import type { Effect } from "./engine";

export type MortarBlastVisual = {
  progress: number;
  alpha: number;
  radius: number;
  damage: number;
  intensity: number;
  shockRadius: number;
  innerRadius: number;
  debrisCount: number;
  debrisLength: number;
  directional: boolean;
  nx: number;
  ny: number;
  px: number;
  py: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function mortarBlastVisual(
  effect:
    | Pick<
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
      >
    | undefined,
): MortarBlastVisual | null {
  if (
    !effect ||
    effect.type !== "blast" ||
    effect.sourceCardId !== "mortar" ||
    !Number.isFinite(effect.life) ||
    !Number.isFinite(effect.maxLife) ||
    effect.maxLife <= 0
  )
    return null;

  const progress = clamp01(1 - effect.life / effect.maxLife);
  const radius =
    Number.isFinite(effect.radius) && (effect.radius ?? 0) > 0
      ? Math.max(16, Math.min(100, effect.radius!))
      : 42;
  const damage =
    Number.isFinite(effect.value) && (effect.value ?? 0) > 0
      ? Math.max(1, Math.min(200, effect.value!))
      : 28;
  const intensity = clamp01(damage / 28);
  const attack = clamp01(progress / 0.12);
  const release = clamp01((1 - progress) / 0.88);
  const eased = 1 - Math.pow(1 - progress, 2.4);

  let nx = 0;
  let ny = -1;
  let directional = false;
  if (
    Number.isFinite(effect.sourceX) &&
    Number.isFinite(effect.sourceY) &&
    Number.isFinite(effect.x) &&
    Number.isFinite(effect.y)
  ) {
    const dx = effect.x - effect.sourceX!;
    const dy = effect.y - effect.sourceY!;
    const d = Math.hypot(dx, dy);
    if (d > 0.001) {
      nx = dx / d;
      ny = dy / d;
      directional = true;
    }
  }

  return {
    progress,
    alpha: (0.22 + release * 0.78) * (0.76 + intensity * 0.24),
    radius,
    damage,
    intensity,
    shockRadius: radius * (0.1 + eased * 0.9),
    innerRadius: radius * (0.06 + eased * 0.36),
    debrisCount: 7 + Math.round(intensity * 5),
    debrisLength: 6 + attack * (5 + intensity * 4),
    directional,
    nx,
    ny,
    px: -ny,
    py: nx,
  };
}
