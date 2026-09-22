export type SlowStatusVisual = {
  active: boolean;
  severity: number;
  alpha: number;
  release: number;
  ringRadius: number;
  innerRadius: number;
  bandCount: number;
  bracketReach: number;
  orbitRadius: number;
  orbitSpeed: number;
  floorWidth: number;
  floorHeight: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function slowStatusVisual(
  slowTime: number,
  slowFactor: number,
): SlowStatusVisual {
  const time = Number.isFinite(slowTime) ? Math.max(0, slowTime) : 0;
  const factor = Number.isFinite(slowFactor)
    ? Math.max(0, Math.min(1, slowFactor))
    : 1;
  const severity = clamp01(1 - factor);
  const active = time > 0.001 && severity > 0.001;

  if (!active)
    return {
      active: false,
      severity: 0,
      alpha: 0,
      release: 1,
      ringRadius: 0,
      innerRadius: 0,
      bandCount: 0,
      bracketReach: 0,
      orbitRadius: 0,
      orbitSpeed: 0,
      floorWidth: 0,
      floorHeight: 0,
    };

  const normalizedSeverity = clamp01(severity / 0.7);
  const release = clamp01(1 - Math.min(1, time / 0.8));
  const alpha =
    (0.48 + normalizedSeverity * 0.34) *
    (1 - release * 0.45);

  return {
    active: true,
    severity,
    alpha,
    release,
    ringRadius: 16 + normalizedSeverity * 7,
    innerRadius: 9 + normalizedSeverity * 4,
    bandCount: 3 + Math.round(normalizedSeverity * 4),
    bracketReach: 4 + normalizedSeverity * 5,
    orbitRadius: 18 + normalizedSeverity * 6,
    orbitSpeed: 0.55 + normalizedSeverity * 0.7,
    floorWidth: 24 + normalizedSeverity * 12,
    floorHeight: 7 + normalizedSeverity * 3,
  };
}
