export type CorePressureState =
  | "stable"
  | "damaged"
  | "critical"
  | "destroyed";

export const CORE_DAMAGED_FRACTION = 0.6;
export const CORE_CRITICAL_FRACTION = 0.3;

export type CorePressure = {
  fraction: number;
  percent: number;
  state: CorePressureState;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function corePressure(hp: number, maxHp: number): CorePressure {
  const safeMax = Number.isFinite(maxHp) && maxHp > 0 ? maxHp : 1;
  const fraction = clamp01(Number.isFinite(hp) ? hp / safeMax : 0);
  const state: CorePressureState =
    fraction <= 0
      ? "destroyed"
      : fraction <= CORE_CRITICAL_FRACTION
        ? "critical"
        : fraction <= CORE_DAMAGED_FRACTION
          ? "damaged"
          : "stable";
  return {
    fraction,
    percent: Math.ceil(fraction * 100),
    state,
  };
}

export function corePressureLabel(
  state: CorePressureState,
  team: "player" | "enemy",
): string {
  if (state === "stable") return "";
  if (state === "destroyed")
    return team === "player" ? "AUSGEFALLEN" : "ZERSTÖRT";
  if (state === "critical")
    return team === "player" ? "CORE KRITISCH" : "DURCHBRUCHFENSTER";
  return team === "player" ? "BESCHÄDIGT" : "ANGREIFBAR";
}
