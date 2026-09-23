import { CARDS, type CardId } from "./engine";

export type DeckLoadoutSlot = {
  index: number;
  kind: "unit" | "ability";
  label: string;
  cardId?: CardId;
  name?: string;
  cost?: number;
};

export type DeckLoadout = {
  slots: DeckLoadoutSlot[];
  unitCount: number;
  abilityCount: number;
  complete: boolean;
};

export function deckLoadout(deck: readonly CardId[]): DeckLoadout {
  const known = deck.filter((id) => CARDS.some((card) => card.id === id));
  const units = known.filter(
    (id) => CARDS.find((card) => card.id === id)?.kind === "unit",
  );
  const abilities = known.filter(
    (id) => CARDS.find((card) => card.id === id)?.kind === "ability",
  );

  const slots: DeckLoadoutSlot[] = [];
  for (let index = 0; index < 6; index++) {
    const cardId = units[index];
    const card = cardId ? CARDS.find((item) => item.id === cardId) : undefined;
    slots.push({
      index,
      kind: "unit",
      label: `EINHEIT ${index + 1}`,
      ...(card
        ? { cardId: card.id, name: card.name, cost: card.cost }
        : {}),
    });
  }
  for (let index = 0; index < 2; index++) {
    const cardId = abilities[index];
    const card = cardId ? CARDS.find((item) => item.id === cardId) : undefined;
    slots.push({
      index: 6 + index,
      kind: "ability",
      label: `TAKTIK ${index + 1}`,
      ...(card
        ? { cardId: card.id, name: card.name, cost: card.cost }
        : {}),
    });
  }

  return {
    slots,
    unitCount: units.length,
    abilityCount: abilities.length,
    complete: units.length === 6 && abilities.length === 2,
  };
}
