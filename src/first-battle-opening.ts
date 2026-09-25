import { CARDS, type CardId } from "./engine";

/**
 * Removes one decision from the very first seconds without changing the deck:
 * Vanguard is the clearest default opener when available; otherwise use the
 * first affordable unit in deck order. Players can still change the selection
 * during the countdown.
 */
export function openingUnitCard(
  deck: readonly CardId[],
  energy: number,
): CardId | null {
  const availableEnergy = Number.isFinite(energy) ? Math.max(0, energy) : 0;
  const affordableUnit = (id: CardId) => {
    const card = CARDS.find((item) => item.id === id);
    return Boolean(
      card &&
        card.kind === "unit" &&
        card.cost <= availableEnergy + 1e-8,
    );
  };

  if (deck.includes("vanguard") && affordableUnit("vanguard"))
    return "vanguard";

  return deck.find(affordableUnit) ?? null;
}

export function firstBattleOpeningCard(
  completedMatches: number,
  deck: readonly CardId[],
  energy: number,
): CardId | null {
  const matches =
    Number.isFinite(completedMatches) && completedMatches > 0
      ? Math.floor(completedMatches)
      : 0;
  if (matches > 0) return null;

  return openingUnitCard(deck, energy);
}

export function rematchOpeningCard(
  deck: readonly CardId[],
  energy: number,
  previousOpening: CardId | null | undefined,
): CardId | null {
  const availableEnergy = Number.isFinite(energy) ? Math.max(0, energy) : 0;
  if (previousOpening && deck.includes(previousOpening)) {
    const previous = CARDS.find((item) => item.id === previousOpening);
    if (
      previous &&
      previous.kind === "unit" &&
      previous.cost <= availableEnergy + 1e-8
    )
      return previousOpening;
  }
  return openingUnitCard(deck, availableEnergy);
}

