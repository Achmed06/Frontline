export type UnitVitalsTrail = {
  hp: number;
  trailHp: number;
  shield: number;
  trailShield: number;
  hpHoldUntil: number;
  shieldHoldUntil: number;
  lastTime: number;
};

export type UnitVitalsSample = UnitVitalsTrail & {
  hpRatio: number;
  trailHpRatio: number;
  shieldRatio: number;
  trailShieldRatio: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function approach(current: number, target: number, amount: number): number {
  if (current <= target) return target;
  return Math.max(target, current - amount);
}

export function sampleUnitVitals(
  previous: UnitVitalsTrail | undefined,
  hp: number,
  maxHp: number,
  shield: number,
  shieldCap: number,
  time: number,
): UnitVitalsSample {
  const safeMaxHp = Math.max(1, maxHp);
  const safeShieldCap = Math.max(1, shieldCap);
  const currentHp = Math.max(0, Math.min(safeMaxHp, hp));
  const currentShield = Math.max(0, Math.min(safeShieldCap, shield));

  if (!previous) {
    return {
      hp: currentHp,
      trailHp: currentHp,
      shield: currentShield,
      trailShield: currentShield,
      hpHoldUntil: time,
      shieldHoldUntil: time,
      lastTime: time,
      hpRatio: clamp01(currentHp / safeMaxHp),
      trailHpRatio: clamp01(currentHp / safeMaxHp),
      shieldRatio: clamp01(currentShield / safeShieldCap),
      trailShieldRatio: clamp01(currentShield / safeShieldCap),
    };
  }

  const dt = Math.max(0, time - previous.lastTime);
  let trailHp = previous.trailHp;
  let trailShield = previous.trailShield;
  let hpHoldUntil = previous.hpHoldUntil;
  let shieldHoldUntil = previous.shieldHoldUntil;

  if (currentHp < previous.hp) {
    trailHp = Math.max(previous.trailHp, previous.hp);
    hpHoldUntil = time + 0.18;
  } else if (currentHp > previous.hp) {
    trailHp = currentHp;
    hpHoldUntil = time;
  } else if (time > hpHoldUntil) {
    trailHp = approach(trailHp, currentHp, safeMaxHp * 1.9 * dt);
  }

  if (currentShield < previous.shield) {
    trailShield = Math.max(previous.trailShield, previous.shield);
    shieldHoldUntil = time + 0.14;
  } else if (currentShield > previous.shield) {
    trailShield = currentShield;
    shieldHoldUntil = time;
  } else if (time > shieldHoldUntil) {
    trailShield = approach(
      trailShield,
      currentShield,
      safeShieldCap * 2.4 * dt,
    );
  }

  trailHp = Math.max(currentHp, Math.min(safeMaxHp, trailHp));
  trailShield = Math.max(
    currentShield,
    Math.min(safeShieldCap, trailShield),
  );

  return {
    hp: currentHp,
    trailHp,
    shield: currentShield,
    trailShield,
    hpHoldUntil,
    shieldHoldUntil,
    lastTime: time,
    hpRatio: clamp01(currentHp / safeMaxHp),
    trailHpRatio: clamp01(trailHp / safeMaxHp),
    shieldRatio: clamp01(currentShield / safeShieldCap),
    trailShieldRatio: clamp01(trailShield / safeShieldCap),
  };
}
