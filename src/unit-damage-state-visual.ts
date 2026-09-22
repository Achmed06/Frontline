export type UnitDamageState = "healthy" | "damaged" | "critical";

export type UnitDamageStateVisual = {
  state: UnitDamageState;
  hpRatio: number;
  intensity: number;
  smokeCount: number;
  sparkCount: number;
  smokeRise: number;
  smokeSpread: number;
  sparkReach: number;
  groundWidth: number;
  groundHeight: number;
  armorAlpha: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function unitDamageStateVisual(
  hp: number,
  maxHp: number,
  cardId: string,
): UnitDamageStateVisual {
  const safeMaxHp =
    Number.isFinite(maxHp) && maxHp > 0 ? maxHp : 1;
  const safeHp = Number.isFinite(hp)
    ? Math.max(0, Math.min(safeMaxHp, hp))
    : safeMaxHp;
  const hpRatio = clamp01(safeHp / safeMaxHp);

  const heavy = cardId === "bulwark" || cardId === "sentinel";
  const siege = cardId === "lancer" || cardId === "mortar";
  const swarm = cardId === "swarm";

  if (hpRatio > 0.55)
    return {
      state: "healthy",
      hpRatio,
      intensity: 0,
      smokeCount: 0,
      sparkCount: 0,
      smokeRise: 0,
      smokeSpread: 0,
      sparkReach: 0,
      groundWidth: 0,
      groundHeight: 0,
      armorAlpha: 0,
    };

  const critical = hpRatio <= 0.3;
  const damageProgress = clamp01((0.55 - hpRatio) / 0.55);
  const criticalBoost = critical ? 0.32 : 0;
  const intensity = clamp01(0.28 + damageProgress * 0.55 + criticalBoost);

  const smokeCount = critical
    ? heavy
      ? 4
      : siege
        ? 3
        : swarm
          ? 2
          : 3
    : heavy || siege
      ? 1
      : 0;

  const sparkCount = critical
    ? heavy
      ? 5
      : swarm
        ? 3
        : 4
    : heavy || siege
      ? 2
      : 1;

  return {
    state: critical ? "critical" : "damaged",
    hpRatio,
    intensity,
    smokeCount,
    sparkCount,
    smokeRise: critical ? (heavy ? 22 : 18) : 10,
    smokeSpread: heavy ? 8 : siege ? 6 : swarm ? 4 : 5,
    sparkReach: heavy ? 11 : siege ? 10 : swarm ? 7 : 8,
    groundWidth: critical ? (heavy ? 22 : siege ? 18 : 15) : 10,
    groundHeight: critical ? (heavy ? 6 : 5) : 3.5,
    armorAlpha: critical ? 0.42 : 0.2,
  };
}
