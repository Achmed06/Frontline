import { ENERGY_RATE } from "./engine";

export type EnergyReadiness = {
  affordable: boolean;
  progress: number;
  missing: number;
  waitSeconds: number;
};

const finiteNonNegative = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

export function energyReadiness(
  energy: number,
  cost: number,
  rate: number = ENERGY_RATE,
): EnergyReadiness {
  const safeEnergy = finiteNonNegative(energy);
  const safeCost = finiteNonNegative(cost);
  const safeRate = finiteNonNegative(rate);

  if (safeCost <= 0)
    return {
      affordable: true,
      progress: 1,
      missing: 0,
      waitSeconds: 0,
    };

  const missing = Math.max(0, safeCost - safeEnergy);
  const affordable = missing <= 1e-8;
  return {
    affordable,
    progress: Math.max(0, Math.min(1, safeEnergy / safeCost)),
    missing: affordable ? 0 : missing,
    waitSeconds:
      affordable || safeRate <= 0 ? 0 : missing / safeRate,
  };
}

export function energySpent(before: number, after: number): number {
  const safeBefore = finiteNonNegative(before);
  const safeAfter = finiteNonNegative(after);
  return Math.max(0, safeBefore - safeAfter);
}


export type EnergyTempo = {
  state: "normal" | "high" | "capped";
  ratio: number;
  remaining: number;
  label: string;
};

export function energyTempo(
  energy: number,
  cap: number,
): EnergyTempo {
  const safeEnergy = finiteNonNegative(energy);
  const safeCap =
    Number.isFinite(cap) && cap > 0 ? cap : 0;
  if (safeCap <= 0)
    return {
      state: "normal",
      ratio: 0,
      remaining: 0,
      label: "ENERGIE",
    };

  const ratio = Math.max(0, Math.min(1, safeEnergy / safeCap));
  const remaining = Math.max(0, safeCap - safeEnergy);
  const state =
    ratio >= 1 - 1e-8
      ? "capped"
      : ratio >= 0.8
        ? "high"
        : "normal";
  return {
    state,
    ratio,
    remaining: state === "capped" ? 0 : remaining,
    label:
      state === "capped"
        ? "ENERGIE VOLL"
        : state === "high"
          ? "ENERGIE FAST VOLL"
          : "ENERGIE",
  };
}
