import { impactProfile, type ImpactKind } from "./combat-feedback";

export type WeaponCycleVisual = {
  active: boolean;
  kind: ImpactKind;
  charge: number;
  remaining: number;
  prominence: number;
  radius: number;
  thickness: number;
  tickCount: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function weaponCycleVisual(
  cardId: string,
  attackCooldown: number,
  interval: number,
): WeaponCycleVisual {
  const profile = impactProfile(cardId);
  const safeInterval =
    Number.isFinite(interval) && interval > 0 ? interval : 1;
  const safeCooldown = Number.isFinite(attackCooldown)
    ? Math.max(0, Math.min(safeInterval, attackCooldown))
    : 0;
  const remaining = clamp01(safeCooldown / safeInterval);
  const charge = clamp01(1 - remaining);

  let prominence = 0;
  switch (profile.kind) {
    case "rail":
    case "explosive":
      prominence = 1;
      break;
    case "heavy":
      prominence = 0.88;
      break;
    case "electric":
      prominence = 0.72;
      break;
    default:
      prominence = 0;
      break;
  }

  const active =
    prominence > 0 &&
    safeCooldown > 0.035 &&
    remaining > 0.015;

  return {
    active,
    kind: profile.kind,
    charge,
    remaining,
    prominence,
    radius:
      profile.kind === "rail" || profile.kind === "explosive"
        ? 18.5
        : profile.kind === "heavy"
          ? 17
          : 16,
    thickness:
      profile.kind === "rail" || profile.kind === "explosive"
        ? 2.4
        : 1.8,
    tickCount:
      profile.kind === "rail"
        ? 5
        : profile.kind === "explosive"
          ? 4
          : profile.kind === "heavy"
            ? 4
            : 3,
  };
}
