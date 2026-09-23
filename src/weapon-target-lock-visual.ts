import { impactProfile, type ImpactKind } from "./combat-feedback";

export type WeaponTargetLockVisual = {
  active: boolean;
  kind: ImpactKind;
  charge: number;
  lock: number;
  prominence: number;
  nx: number;
  ny: number;
  px: number;
  py: number;
  alpha: number;
  bracketRadius: number;
  bracketArm: number;
  sightAlpha: number;
  dashCount: number;
  targetPulse: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function weaponTargetLockVisual(
  cardId: string,
  attackCooldown: number,
  interval: number,
  inRange: boolean,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  targetRadius: number,
): WeaponTargetLockVisual {
  const profile = impactProfile(cardId);
  const safeInterval =
    Number.isFinite(interval) && interval > 0 ? interval : 1;
  const safeCooldown = Number.isFinite(attackCooldown)
    ? Math.max(0, Math.min(safeInterval, attackCooldown))
    : safeInterval;
  const charge = clamp01(1 - safeCooldown / safeInterval);

  let prominence = 0;
  switch (profile.kind) {
    case "rail":
    case "explosive":
      prominence = 1;
      break;
    case "heavy":
      prominence = 0.82;
      break;
    case "electric":
      prominence = 0.66;
      break;
    default:
      prominence = 0;
      break;
  }

  const coordinatesValid =
    Number.isFinite(sourceX) &&
    Number.isFinite(sourceY) &&
    Number.isFinite(targetX) &&
    Number.isFinite(targetY);
  const dx = coordinatesValid ? targetX - sourceX : 0;
  const dy = coordinatesValid ? targetY - sourceY : 0;
  const distance = Math.hypot(dx, dy);
  const lock = clamp01((charge - 0.62) / 0.38);
  const active =
    prominence > 0 &&
    inRange &&
    coordinatesValid &&
    distance > 0.001 &&
    lock > 0.001;
  const nx = active ? dx / distance : 0;
  const ny = active ? dy / distance : 0;
  const safeRadius =
    Number.isFinite(targetRadius) && targetRadius > 0 ? targetRadius : 9;

  if (!active)
    return {
      active: false,
      kind: profile.kind,
      charge,
      lock: 0,
      prominence,
      nx: 0,
      ny: 0,
      px: 0,
      py: 0,
      alpha: 0,
      bracketRadius: 0,
      bracketArm: 0,
      sightAlpha: 0,
      dashCount: 0,
      targetPulse: 0,
    };

  return {
    active: true,
    kind: profile.kind,
    charge,
    lock,
    prominence,
    nx,
    ny,
    px: -ny,
    py: nx,
    alpha: (0.24 + lock * 0.58) * prominence,
    bracketRadius: safeRadius + 10 - lock * 4.5,
    bracketArm: 3.8 + prominence * 2.8 + lock * 1.6,
    sightAlpha: (0.06 + lock * 0.24) * prominence,
    dashCount:
      profile.kind === "rail"
        ? 4
        : profile.kind === "explosive"
          ? 3
          : 2,
    targetPulse: lock >= 0.72 ? (lock - 0.72) / 0.28 : 0,
  };
}
