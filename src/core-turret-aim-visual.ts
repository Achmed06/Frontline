import { coreTurretVisual } from "./core-turret-visual";

export type CoreTurretAimVisual = {
  active: boolean;
  nx: number;
  ny: number;
  px: number;
  py: number;
  angle: number;
  charge: number;
  phase: "reload" | "track" | "lock";
  headOffset: number;
  barrelLength: number;
  barrelWidth: number;
  prongSpread: number;
  muzzleRadius: number;
};

const neutral = (): CoreTurretAimVisual => ({
  active: false,
  nx: 0,
  ny: 0,
  px: 0,
  py: 0,
  angle: 0,
  charge: 0,
  phase: "reload",
  headOffset: 0,
  barrelLength: 0,
  barrelWidth: 0,
  prongSpread: 0,
  muzzleRadius: 0,
});

export function coreTurretAimVisual(
  coreX: number,
  coreY: number,
  targetX: number | undefined,
  targetY: number | undefined,
  cooldownSeconds: number,
): CoreTurretAimVisual {
  if (
    !Number.isFinite(coreX) ||
    !Number.isFinite(coreY) ||
    !Number.isFinite(targetX) ||
    !Number.isFinite(targetY)
  )
    return neutral();

  const dx = (targetX as number) - coreX;
  const dy = (targetY as number) - coreY;
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance < 0.001) return neutral();

  const cycle = coreTurretVisual(cooldownSeconds);
  const nx = dx / distance;
  const ny = dy / distance;
  const phaseBoost =
    cycle.phase === "lock" ? 1 : cycle.phase === "track" ? 0.62 : 0.28;

  return {
    active: true,
    nx,
    ny,
    px: -ny,
    py: nx,
    angle: Math.atan2(ny, nx),
    charge: cycle.charge,
    phase: cycle.phase,
    headOffset: 1.2 + cycle.charge * 1.8,
    barrelLength: 11 + cycle.charge * 7 + phaseBoost * 2,
    barrelWidth: 1.4 + phaseBoost * 1.1,
    prongSpread: 3.2 + cycle.charge * 1.8,
    muzzleRadius: 1.5 + cycle.charge * 1.7,
  };
}
