import type { CardDefinition } from "./engine";

const percentBonus = (multiplier: number | undefined): number =>
  Math.round(((multiplier ?? 1) - 1) * 100);

const percentReduction = (factor: number | undefined): number =>
  Math.round((1 - (factor ?? 1)) * 100);

export function selectedCardHint(
  card: CardDefinition | undefined,
): string {
  if (!card) return "ANTIPPEN ODER DIREKT INS FELD ZIEHEN";

  if (card.kind === "unit") {
    if (card.id === "pioneer")
      return `+${percentBonus(card.captureMultiplier)}% EROBERUNG · ${card.hp ?? 0} HP · ${card.damage ?? 0} SCHADEN`;

    if (card.id === "breaker")
      return `${card.shieldBreak ?? 0} SCHILDBRUCH · ${card.damage ?? 0} SCHADEN · ${card.hp ?? 0} HP`;

    if (card.id === "lancer")
      return `${card.damage ?? 0} SCHADEN · +${percentBonus(card.coreDamageMultiplier)}% CORE · ${card.range ?? 0} REICHWEITE`;

    if (card.id === "medic")
      return `+${card.heal ?? 0} HP · ${card.supportRange ?? 0} HEILREICHWEITE · ${String(card.supportInterval ?? 0).replace(".", ",")}s TAKT`;

    if (card.id === "mortar")
      return `${card.damage ?? 0} DIREKT · ${card.splashDamage ?? 0} SPLASH · ${card.splashRadius ?? 0} RADIUS`;

    if (card.id === "disruptor")
      return `${card.damage ?? 0} SCHADEN · -${percentReduction(card.slowFactor)}% BEWEGUNG · ${card.slowDuration ?? 0}s`;

    return card.description;
  }

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

export function openingUnitHint(
  card: CardDefinition | undefined,
): string | null {
  if (!card || card.kind !== "unit") return null;

  switch (card.id) {
    case "pioneer":
      return "OPENING · EROBERN · +50% PUNKT · SCHWACH IM DUELL";
    case "vanguard":
      return `OPENING · HALTEN · ${card.cost} ENERGIE · ${card.hp ?? 0} HP`;
    case "swarm":
      return "OPENING · EROBERN · 3 TRUPPEN · PULSE-RISIKO";
    case "raider":
      return `OPENING · DRUCK · TEMPO ${card.speed ?? 0} · ${card.hp ?? 0} HP`;
    case "ranger":
      return `OPENING · DECKUNG · ${card.range ?? 0} REICHWEITE · HINTER FRONT`;
    case "bulwark":
      return `OPENING · ABSICHERN · ${card.hp ?? 0} HP · LANGSAM`;
    case "lancer":
      return `OPENING · CORE-DRUCK · ${card.range ?? 0} REICHWEITE · LANGSAM`;
    case "medic":
      return "OPENING · SUPPORT · BRAUCHT EINE FRONTLINIE";
    default:
      return null;
  }
}

