import type { ControlPointPressure } from "./engine";

export type CaptureSpecialistVisual = {
  active: boolean;
  specialistBoost: number;
  totalMultiplier: number;
  alpha: number;
  ringRadius: number;
  nodeCount: number;
  chevronCount: number;
  chevronReach: number;
  sweepSpeed: number;
  pulseScale: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function captureSpecialistVisual(
  pressure: Pick<
    ControlPointPressure,
    "mode" | "captureMultiplier" | "groupMultiplier" | "capturer"
  >,
): CaptureSpecialistVisual {
  const captureMultiplier = Number.isFinite(pressure.captureMultiplier)
    ? Math.max(1, pressure.captureMultiplier)
    : 1;
  const groupMultiplier = Number.isFinite(pressure.groupMultiplier)
    ? Math.max(1, pressure.groupMultiplier)
    : 1;
  const specialistBoost = clamp01((captureMultiplier - 1) / 0.5);
  const active =
    pressure.mode === "capture" &&
    pressure.capturer !== null &&
    specialistBoost > 0.001;

  if (!active)
    return {
      active: false,
      specialistBoost: 0,
      totalMultiplier: captureMultiplier * groupMultiplier,
      alpha: 0,
      ringRadius: 0,
      nodeCount: 0,
      chevronCount: 0,
      chevronReach: 0,
      sweepSpeed: 0,
      pulseScale: 0,
    };

  const totalMultiplier = captureMultiplier * groupMultiplier;

  return {
    active: true,
    specialistBoost,
    totalMultiplier,
    alpha: 0.48 + specialistBoost * 0.28,
    ringRadius: 48 + specialistBoost * 5,
    nodeCount: 3 + Math.round(specialistBoost * 3),
    chevronCount: 2 + Math.round(specialistBoost * 2),
    chevronReach: 5 + specialistBoost * 4,
    sweepSpeed: 0.55 + specialistBoost * 0.65,
    pulseScale: 1 + Math.min(0.35, (totalMultiplier - 1) * 0.28),
  };
}
