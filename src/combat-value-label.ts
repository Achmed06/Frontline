import type { Effect } from "./engine";

export type CombatValuePresentation = {
  text: string;
  color: string;
  xOffset: number;
  yOffset: number;
};

export function combatValuePresentation(
  effect: Pick<Effect, "type" | "team" | "value">,
): CombatValuePresentation | null {
  const value = effect.value ?? 0;
  if (!Number.isFinite(value)) return null;

  if (effect.type === "frontline" && value !== 0)
    return {
      text:
        value > 0
          ? `VORRÜCKEN +${Math.abs(value)} SEKTOR${Math.abs(value) === 1 ? "" : "EN"}`
          : `RÜCKZUG −${Math.abs(value)} SEKTOR${Math.abs(value) === 1 ? "" : "EN"}`,
      color: effect.team === "player" ? "#83ffcf" : "#ffc0a2",
      xOffset: 0,
      yOffset: 0,
    };

  if (value <= 0) return null;

  if (effect.type === "shield-hit" && value >= 15)
    return {
      text: `−${Math.round(value)} SCH`,
      color: effect.team === "player" ? "#a9dfff" : "#ffd0c3",
      xOffset: -7,
      yOffset: -8,
    };

  if (effect.type === "impact" && value >= 20)
    return {
      text: `−${Math.round(value)} HP`,
      color: "#ffd0a0",
      xOffset: 7,
      yOffset: 0,
    };

  if (effect.type === "core-hit" && value >= 35)
    return {
      text: `−${Math.round(value)} CORE`,
      color: "#ffe39a",
      xOffset: 0,
      yOffset: 0,
    };

  if (effect.type === "heal" && value >= 30)
    return {
      text: `+${Math.round(value)} HP`,
      color: "#9dffd0",
      xOffset: 0,
      yOffset: 0,
    };

  if (effect.type === "shield" && value >= 20)
    return {
      text: `+${Math.round(value)} SCH`,
      color: "#a9dfff",
      xOffset: 0,
      yOffset: -4,
    };

  return null;
}
