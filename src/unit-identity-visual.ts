export type UnitIdentityKind =
  | "standard"
  | "heavy"
  | "skirmisher"
  | "marksman"
  | "swarm"
  | "siege"
  | "support"
  | "controller";

export type UnitIdentityVisual = {
  kind: UnitIdentityKind;
  displaySize: number;
  verticalOffset: number;
  bobAmplitude: number;
  bobScale: number;
  swayAmplitude: number;
  leanScale: number;
  shadowWidth: number;
  shadowHeight: number;
  ringWidth: number;
  ringHeight: number;
  ringAlpha: number;
};

const DEFAULT_IDENTITY: UnitIdentityVisual = {
  kind: "standard",
  displaySize: 36,
  verticalOffset: -3,
  bobAmplitude: 1.6,
  bobScale: 0.018,
  swayAmplitude: 1.2,
  leanScale: 1,
  shadowWidth: 0.65,
  shadowHeight: 0.25,
  ringWidth: 0.75,
  ringHeight: 0.32,
  ringAlpha: 0.9,
};

const IDENTITIES: Record<string, UnitIdentityVisual> = {
  pioneer: {
    kind: "skirmisher",
    displaySize: 34,
    verticalOffset: -3,
    bobAmplitude: 1.9,
    bobScale: 0.022,
    swayAmplitude: 1.65,
    leanScale: 1.18,
    shadowWidth: 0.6,
    shadowHeight: 0.22,
    ringWidth: 0.72,
    ringHeight: 0.29,
    ringAlpha: 0.88,
  },
  breaker: {
    kind: "heavy",
    displaySize: 39,
    verticalOffset: -3,
    bobAmplitude: 1.05,
    bobScale: 0.012,
    swayAmplitude: 0.72,
    leanScale: 0.72,
    shadowWidth: 0.75,
    shadowHeight: 0.28,
    ringWidth: 0.82,
    ringHeight: 0.34,
    ringAlpha: 0.94,
  },
  vanguard: { ...DEFAULT_IDENTITY },
  bulwark: {
    kind: "heavy",
    displaySize: 46,
    verticalOffset: -2,
    bobAmplitude: 0.6,
    bobScale: 0.009,
    swayAmplitude: 0.42,
    leanScale: 0.42,
    shadowWidth: 0.84,
    shadowHeight: 0.31,
    ringWidth: 0.88,
    ringHeight: 0.36,
    ringAlpha: 0.98,
  },
  ranger: {
    kind: "marksman",
    displaySize: 34,
    verticalOffset: -4,
    bobAmplitude: 1.25,
    bobScale: 0.013,
    swayAmplitude: 0.72,
    leanScale: 0.78,
    shadowWidth: 0.57,
    shadowHeight: 0.2,
    ringWidth: 0.67,
    ringHeight: 0.27,
    ringAlpha: 0.86,
  },
  swarm: {
    kind: "swarm",
    displaySize: 29,
    verticalOffset: -2,
    bobAmplitude: 2.35,
    bobScale: 0.03,
    swayAmplitude: 2.1,
    leanScale: 1.55,
    shadowWidth: 0.58,
    shadowHeight: 0.2,
    ringWidth: 0.68,
    ringHeight: 0.27,
    ringAlpha: 0.82,
  },
  lancer: {
    kind: "siege",
    displaySize: 41,
    verticalOffset: -3,
    bobAmplitude: 0.9,
    bobScale: 0.011,
    swayAmplitude: 0.8,
    leanScale: 0.86,
    shadowWidth: 0.78,
    shadowHeight: 0.27,
    ringWidth: 0.84,
    ringHeight: 0.34,
    ringAlpha: 0.94,
  },
  medic: {
    kind: "support",
    displaySize: 36,
    verticalOffset: -4,
    bobAmplitude: 0.95,
    bobScale: 0.011,
    swayAmplitude: 0.5,
    leanScale: 0.62,
    shadowWidth: 0.62,
    shadowHeight: 0.22,
    ringWidth: 0.74,
    ringHeight: 0.3,
    ringAlpha: 0.88,
  },
  raider: {
    kind: "skirmisher",
    displaySize: 35,
    verticalOffset: -2,
    bobAmplitude: 2.2,
    bobScale: 0.027,
    swayAmplitude: 2.35,
    leanScale: 1.6,
    shadowWidth: 0.61,
    shadowHeight: 0.21,
    ringWidth: 0.7,
    ringHeight: 0.28,
    ringAlpha: 0.86,
  },
  sentinel: {
    kind: "heavy",
    displaySize: 43,
    verticalOffset: -2,
    bobAmplitude: 0.68,
    bobScale: 0.009,
    swayAmplitude: 0.38,
    leanScale: 0.4,
    shadowWidth: 0.82,
    shadowHeight: 0.3,
    ringWidth: 0.87,
    ringHeight: 0.35,
    ringAlpha: 0.97,
  },
  mortar: {
    kind: "siege",
    displaySize: 42,
    verticalOffset: -2,
    bobAmplitude: 0.42,
    bobScale: 0.006,
    swayAmplitude: 0.28,
    leanScale: 0.34,
    shadowWidth: 0.86,
    shadowHeight: 0.31,
    ringWidth: 0.9,
    ringHeight: 0.36,
    ringAlpha: 0.96,
  },
  disruptor: {
    kind: "controller",
    displaySize: 38,
    verticalOffset: -4,
    bobAmplitude: 1.0,
    bobScale: 0.014,
    swayAmplitude: 0.62,
    leanScale: 0.7,
    shadowWidth: 0.67,
    shadowHeight: 0.23,
    ringWidth: 0.77,
    ringHeight: 0.31,
    ringAlpha: 0.91,
  },
};

export function unitIdentityVisual(cardId: string): UnitIdentityVisual {
  return IDENTITIES[cardId] ?? DEFAULT_IDENTITY;
}
