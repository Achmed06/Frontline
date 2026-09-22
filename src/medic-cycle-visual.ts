export type MedicCycleVisual = {
  active: boolean;
  ready: boolean;
  charge: number;
  remaining: number;
  alpha: number;
  ringRadius: number;
  ringThickness: number;
  segmentCount: number;
  filledSegments: number;
  packetCount: number;
  packetRadius: number;
  crossReach: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function medicCycleVisual(
  cardId: string,
  healCooldown: number,
  supportInterval: number,
): MedicCycleVisual {
  if (cardId !== "medic")
    return {
      active: false,
      ready: false,
      charge: 0,
      remaining: 0,
      alpha: 0,
      ringRadius: 0,
      ringThickness: 0,
      segmentCount: 0,
      filledSegments: 0,
      packetCount: 0,
      packetRadius: 0,
      crossReach: 0,
    };

  const interval =
    Number.isFinite(supportInterval) && supportInterval > 0
      ? supportInterval
      : 1;
  const cooldown = Number.isFinite(healCooldown)
    ? Math.max(0, Math.min(interval, healCooldown))
    : interval;
  const remaining = clamp01(cooldown / interval);
  const charge = clamp01(1 - remaining);
  const ready = cooldown <= 0.035;
  const segmentCount = 8;

  return {
    active: true,
    ready,
    charge,
    remaining,
    alpha: 0.42 + charge * 0.38,
    ringRadius: 14.5 + charge * 1.5,
    ringThickness: 1.2 + charge * 1.1,
    segmentCount,
    filledSegments: ready
      ? segmentCount
      : Math.max(0, Math.floor(charge * segmentCount)),
    packetCount: ready ? 3 : charge >= 0.66 ? 2 : charge >= 0.33 ? 1 : 0,
    packetRadius: 10 + charge * 4,
    crossReach: 3.2 + charge * 2.8,
  };
}
