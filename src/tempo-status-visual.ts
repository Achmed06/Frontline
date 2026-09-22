import {
  TEMPO_ATTACK_SPEED_MULTIPLIER,
  TEMPO_MOVE_SPEED_MULTIPLIER,
} from "./tempo";

export type TempoStatusVisual = {
  active: boolean;
  remaining: number;
  release: number;
  alpha: number;
  moveBoost: number;
  attackBoost: number;
  moveStrength: number;
  attackStrength: number;
  chevronCount: number;
  chevronSpacing: number;
  flowLength: number;
  ringRadius: number;
  ringThickness: number;
  tickCount: number;
  flowSpeed: number;
  cycleSpeed: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function tempoStatusVisual(
  rallyTime: number,
): TempoStatusVisual {
  const remaining = Number.isFinite(rallyTime)
    ? Math.max(0, rallyTime)
    : 0;
  const moveBoost = Math.max(0, TEMPO_MOVE_SPEED_MULTIPLIER - 1);
  const attackBoost = Math.max(0, TEMPO_ATTACK_SPEED_MULTIPLIER - 1);
  const active =
    remaining > 0.001 && (moveBoost > 0.001 || attackBoost > 0.001);

  if (!active)
    return {
      active: false,
      remaining: 0,
      release: 1,
      alpha: 0,
      moveBoost,
      attackBoost,
      moveStrength: 0,
      attackStrength: 0,
      chevronCount: 0,
      chevronSpacing: 0,
      flowLength: 0,
      ringRadius: 0,
      ringThickness: 0,
      tickCount: 0,
      flowSpeed: 0,
      cycleSpeed: 0,
    };

  const moveStrength = clamp01(moveBoost / 0.5);
  const attackStrength = clamp01(attackBoost / 0.5);
  const release = clamp01(1 - Math.min(1, remaining / 0.8));
  const alpha =
    (0.58 + Math.max(moveStrength, attackStrength) * 0.24) *
    (1 - release * 0.5);

  return {
    active: true,
    remaining,
    release,
    alpha,
    moveBoost,
    attackBoost,
    moveStrength,
    attackStrength,
    chevronCount: 2 + Math.round(moveStrength * 3),
    chevronSpacing: 4.5 + moveStrength * 2.5,
    flowLength: 9 + moveStrength * 8,
    ringRadius: 17 + attackStrength * 5,
    ringThickness: 1.4 + attackStrength * 1.5,
    tickCount: 4 + Math.round(attackStrength * 5),
    flowSpeed: 1.2 + moveStrength * 2.2,
    cycleSpeed: 1.6 + attackStrength * 2.8,
  };
}
