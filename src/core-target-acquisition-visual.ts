export type CoreTargetAcquisitionVisual = {
  active: boolean;
  progress: number;
  alpha: number;
  ringRadius: number;
  innerRadius: number;
  bracketReach: number;
  scanT: number;
  sweepCount: number;
  sweepLength: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function coreTargetAcquisitionVisual(
  elapsedSeconds: number,
  targetRadius: number,
  durationSeconds = 0.48,
): CoreTargetAcquisitionVisual {
  const duration =
    Number.isFinite(durationSeconds) && durationSeconds > 0
      ? durationSeconds
      : 0.48;
  const elapsed = Number.isFinite(elapsedSeconds)
    ? Math.max(0, elapsedSeconds)
    : duration;
  const progress = clamp01(elapsed / duration);
  const active = elapsed < duration;
  const radius =
    Number.isFinite(targetRadius) && targetRadius > 0
      ? Math.max(5, Math.min(30, targetRadius))
      : 9;

  if (!active)
    return {
      active: false,
      progress: 1,
      alpha: 0,
      ringRadius: radius + 5,
      innerRadius: radius + 3,
      bracketReach: 0,
      scanT: 1,
      sweepCount: 0,
      sweepLength: 0,
    };

  const settle = 1 - progress;
  return {
    active: true,
    progress,
    alpha: 0.28 + settle * 0.62,
    ringRadius: radius + 5 + settle * 18,
    innerRadius: radius + 3 + settle * 7,
    bracketReach: 4 + settle * 5,
    scanT: clamp01(progress * 1.18),
    sweepCount: 3,
    sweepLength: 6 + settle * 6,
  };
}
