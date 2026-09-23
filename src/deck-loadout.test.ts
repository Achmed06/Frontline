import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_DECK } from "./engine";
import { deckLoadout } from "./deck-loadout";

test("complete deck is split into six unit and two tactic slots", () => {
  const loadout = deckLoadout(DEFAULT_DECK);
  assert.equal(loadout.unitCount, 6);
  assert.equal(loadout.abilityCount, 2);
  assert.equal(loadout.complete, true);
  assert.equal(loadout.slots.length, 8);
  assert.equal(loadout.slots.slice(0, 6).every((slot) => slot.kind === "unit"), true);
  assert.equal(loadout.slots.slice(6).every((slot) => slot.kind === "ability"), true);
  assert.equal(loadout.slots.every((slot) => Boolean(slot.cardId)), true);
});

test("partial deck exposes exact empty positions", () => {
  const loadout = deckLoadout(["vanguard", "ranger", "pulse"]);
  assert.equal(loadout.unitCount, 2);
  assert.equal(loadout.abilityCount, 1);
  assert.equal(loadout.complete, false);
  assert.equal(loadout.slots[0].cardId, "vanguard");
  assert.equal(loadout.slots[1].cardId, "ranger");
  assert.equal(loadout.slots[2].cardId, undefined);
  assert.equal(loadout.slots[6].cardId, "pulse");
  assert.equal(loadout.slots[7].cardId, undefined);
});

test("unit and tactic order remain stable within their slot groups", () => {
  const loadout = deckLoadout([
    "repulsor",
    "medic",
    "vanguard",
    "stasis",
    "mortar",
  ]);
  assert.deepEqual(
    loadout.slots.slice(0, 3).map((slot) => slot.cardId),
    ["medic", "vanguard", "mortar"],
  );
  assert.deepEqual(
    loadout.slots.slice(6).map((slot) => slot.cardId),
    ["repulsor", "stasis"],
  );
});

test("unknown values do not create fake filled slots", () => {
  const loadout = deckLoadout(["vanguard", "bogus" as never, "pulse"]);
  assert.equal(loadout.unitCount, 1);
  assert.equal(loadout.abilityCount, 1);
  assert.equal(loadout.slots[1].cardId, undefined);
  assert.equal(loadout.complete, false);
});

test("slot metadata comes from canonical card definitions", () => {
  const loadout = deckLoadout(["vanguard"]);
  assert.equal(loadout.slots[0].name, "Vanguard");
  assert.equal(loadout.slots[0].cost, 2);
  assert.equal(loadout.slots[0].label, "EINHEIT 1");
  assert.equal(loadout.slots[6].label, "TAKTIK 1");
});
