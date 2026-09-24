import type { Effect } from "./engine";

export type KillConfirmationCue = "kill" | "heavyKill";

export type KillConfirmation = {
  cue: KillConfirmationCue;
  heavy: boolean;
  intensity: number;
  ringScale: number;
};

type DeathEffect = Pick<
  Effect,
  "type" | "team" | "value" | "radius"
>;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * Presentation-only confirmation for player-caused unit deaths.
 * Death effects keep the victim team, so an enemy death is a player kill.
 */
export function killConfirmation(
  effect: DeathEffect | undefined,
): KillConfirmation | null {
  if (!effect || effect.type !== "death" || effect.team !== "enemy")
    return null;

  const durability =
    Number.isFinite(effect.value) && (effect.value ?? 0) > 0
      ? effect.value ?? 0
      : 0;
  const radius =
    Number.isFinite(effect.radius) && (effect.radius ?? 0) > 0
      ? effect.radius ?? 18
      : 18;
  const heavy = durability >= 220 || radius >= 28;
  const durabilityFactor = durability > 0
    ? clamp01((durability - 70) / 370)
    : clamp01((radius - 18) / 16);
  const intensity = heavy
    ? 0.9 + durabilityFactor * 0.1
    : 0.58 + durabilityFactor * 0.2;

  return {
    cue: heavy ? "heavyKill" : "kill",
    heavy,
    intensity,
    ringScale: heavy ? 1.35 : 1,
  };
}

export function strongestKillConfirmation(
  effects: readonly DeathEffect[],
): KillConfirmation | null {
  let strongest: KillConfirmation | null = null;
  for (const effect of effects) {
    const confirmation = killConfirmation(effect);
    if (!confirmation) continue;
    if (
      !strongest ||
      Number(confirmation.heavy) > Number(strongest.heavy) ||
      confirmation.intensity > strongest.intensity
    )
      strongest = confirmation;
  }
  return strongest;
}
