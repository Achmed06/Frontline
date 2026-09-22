import type { Effect } from "./engine";

export type CoreTurretFireFeedback = {
  active: boolean;
  nx: number;
  ny: number;
  strength: number;
  recoil: number;
  muzzleDistance: number;
  flareRadius: number;
  ventSpread: number;
};

type ShotEffect = Pick<
  Effect,
  | "type"
  | "sourceCardId"
  | "x"
  | "y"
  | "targetX"
  | "targetY"
  | "life"
  | "maxLife"
>;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const neutral = (): CoreTurretFireFeedback => ({
  active: false,
  nx: 0,
  ny: 0,
  strength: 0,
  recoil: 0,
  muzzleDistance: 0,
  flareRadius: 0,
  ventSpread: 0,
});

export function coreTurretFireFeedback(
  effect: ShotEffect | undefined,
): CoreTurretFireFeedback {
  if (
    !effect ||
    effect.type !== "shot" ||
    effect.sourceCardId !== "core-turret" ||
    !Number.isFinite(effect.x) ||
    !Number.isFinite(effect.y) ||
    !Number.isFinite(effect.targetX) ||
    !Number.isFinite(effect.targetY)
  )
    return neutral();

  const dx = (effect.targetX as number) - effect.x;
  const dy = (effect.targetY as number) - effect.y;
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance < 0.001) return neutral();

  const maxLife =
    Number.isFinite(effect.maxLife) && effect.maxLife > 0
      ? effect.maxLife
      : 1;
  const life = Number.isFinite(effect.life)
    ? Math.max(0, Math.min(maxLife, effect.life))
    : 0;
  const strength = clamp01(life / maxLife);
  if (strength <= 0) return neutral();

  return {
    active: true,
    nx: dx / distance,
    ny: dy / distance,
    strength,
    recoil: 4.2 * strength,
    muzzleDistance: 18 + 5 * strength,
    flareRadius: 3.2 + 3.8 * strength,
    ventSpread: 7 + 5 * strength,
  };
}
