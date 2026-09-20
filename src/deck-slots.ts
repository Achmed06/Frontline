/** New named deck snapshots; active deck and ongoing series remain independent. */
import { isValidDeck, type CardId } from "./engine";
export const DECK_SLOT_COUNT = 3;
export const DECK_NAME_LIMIT = 24;
export type DeckSlot = { name: string; cards: CardId[] } | null;
export function normalizeDeckSlots(value: unknown): DeckSlot[] {
  return Array.from({ length: DECK_SLOT_COUNT }, (_, index) => {
    const slot = Array.isArray(value) ? value[index] : null;
    if (!slot || typeof slot !== "object" || !isValidDeck(slot.cards))
      return null;
    const name =
      typeof slot.name === "string"
        ? slot.name.trim().slice(0, DECK_NAME_LIMIT)
        : "";
    return { name: name || `Deck ${index + 1}`, cards: [...slot.cards] };
  });
}
export function storeDeckSlot(
  slots: readonly DeckSlot[],
  index: number,
  name: string,
  cards: readonly CardId[],
): DeckSlot[] {
  const next = normalizeDeckSlots(slots);
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= DECK_SLOT_COUNT ||
    !isValidDeck(cards)
  )
    return next;
  next[index] = {
    name: name.trim().slice(0, DECK_NAME_LIMIT) || `Deck ${index + 1}`,
    cards: [...cards],
  };
  return next;
}
