import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DECK } from "./engine";
import { normalizeDeckSlots, storeDeckSlot } from "./deck-slots";
import { readDeckSlots, saveDeckSlots, readDeck, saveDeck } from "./storage";

test("deck slots validate snapshots, preserve empty positions and isolate edits", () => {
  const empty = normalizeDeckSlots(null);
  assert.deepEqual(empty, [null, null, null]);
  const cards = [...DEFAULT_DECK];
  const saved = storeDeckSlot(empty, 2, "  Meine Front  ", cards);
  assert.equal(saved[2]!.name, "Meine Front");
  assert.deepEqual(empty, [null, null, null]);
  cards.pop();
  assert.equal(saved[2]!.cards.length, 8);
  assert.deepEqual(storeDeckSlot(saved, 2, "Bad", cards), saved);
  assert.deepEqual(storeDeckSlot(saved, -1, "Bad", DEFAULT_DECK), saved);
  assert.deepEqual(
    normalizeDeckSlots([null, { cards: ["fake"] }, saved[2], saved[2]]),
    saved,
  );
  assert.equal(storeDeckSlot(saved, 1, " ", DEFAULT_DECK)[1]!.name, "Deck 2");
  assert.equal(
    storeDeckSlot(saved, 1, "x".repeat(40), DEFAULT_DECK)[1]!.name.length,
    24,
  );
});

test("deck slots migrate the active deck and save independently with storage failure reporting", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const data = new Map<string, string>();
  let blocked = false;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (blocked) throw Error("Unavailable");
        data.set(key, value);
      },
    },
  });
  try {
    const active = [...DEFAULT_DECK].reverse();
    assert.equal(saveDeck(active), true);
    const migrated = readDeckSlots();
    assert.deepEqual(migrated[0]!.cards, active);
    const slots = storeDeckSlot(migrated, 1, "Konter", DEFAULT_DECK);
    assert.equal(saveDeckSlots(slots), true);
    assert.deepEqual(readDeckSlots(), slots);
    assert.deepEqual(readDeck(), active);
    blocked = true;
    assert.equal(saveDeckSlots(migrated), false);
    assert.deepEqual(readDeckSlots(), slots);
    data.set("frontline-deck-slots-v1", "broken");
    assert.deepEqual(readDeckSlots(), [null, null, null]);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
