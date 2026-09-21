import type { CardDefinition } from "./engine";

const percentBonus = (multiplier: number | undefined): number =>
  Math.round(((multiplier ?? 1) - 1) * 100);

const percentReduction = (factor: number | undefined): number =>
  Math.round((1 - (factor ?? 1)) * 100);

export function selectedCardHint(
  card: CardDefinition | undefined,
): string {
  if (!card) return "Karte wählen → halten, zielen, loslassen";
  if (card.kind !== "ability") return card.description;

  if (card.id === "pulse")
    return `${card.damage ?? 0} SCHADEN · ${card.coreDamage ?? 0} CORE · ZIELEN & LOSLASSEN`;

  if (card.id === "rally")
    return `+${card.heal ?? 0} HP · +${percentBonus(card.moveSpeedMultiplier)}% BEWEGUNG · +${percentBonus(card.attackSpeedMultiplier)}% ANGRIFF · ${card.rallyDuration ?? 0}s`;

  if (card.id === "stasis")
    return `-${percentReduction(card.slowFactor)}% BEWEGUNG · ${card.slowDuration ?? 0}s · KEIN SCHADEN`;

  if (card.id === "repulsor")
    return `${card.pushDistance ?? 0} PUSH · KEIN SCHADEN · ZIELEN & LOSLASSEN`;

  return `${card.description} · HALTEN, ZIELEN, LOSLASSEN`;
}
