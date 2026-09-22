import { CORE_TURRET_INTERVAL } from "./engine";

export type CoreTurretVisual = {
  charge: number;
  phase: "reload" | "track" | "lock";
  bracketScale: number;
  sightAlpha: number;
  chargeAlpha: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function coreTurretVisual(
  cooldownSeconds: number,
  intervalSeconds: number = CORE_TURRET_INTERVAL,
): CoreTurretVisual {
  const interval =
    Number.isFinite(intervalSeconds) && intervalSeconds > 0
      ? intervalSeconds
      : CORE_TURRET_INTERVAL;
  const cooldown = Number.isFinite(cooldownSeconds)
    ? Math.max(0, Math.min(interval, cooldownSeconds))
    : 0;
  const charge = clamp01(1 - cooldown / interval);
  const phase = charge >= 0.78 ? "lock" : charge >= 0.34 ? "track" : "reload";

  return {
    charge,
    phase,
    bracketScale: 1.18 - charge * 0.28,
    sightAlpha: 0.18 + charge * 0.5,
    chargeAlpha: 0.28 + charge * 0.62,
  };
}
