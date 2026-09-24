import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_DECK } from "./engine";
import { firstBattleOpeningCard } from "./first-battle-opening";

test("prepares Vanguard for the very first battle when it is in the deck", () => {
  assert.equal(firstBattleOpeningCard(0, DEFAULT_DECK, 6), "vanguard");
});

test("returning players keep full control over their opening selection", () => {
  assert.equal(firstBattleOpeningCard(1, DEFAULT_DECK, 6), null);
  assert.equal(firstBattleOpeningCard(40, DEFAULT_DECK, 6), null);
});

test("falls back to the first affordable unit when Vanguard is unavailable", () => {
  assert.equal(
    firstBattleOpeningCard(0, ["ranger", "pulse", "bulwark"], 3),
    "ranger",
  );
});

test("never preselects an unaffordable card or an ability", () => {
  assert.equal(
    firstBattleOpeningCard(0, ["pulse", "bulwark", "rally"], 3),
    null,
  );
});

test("malformed match counts safely behave like an unplayed account", () => {
  assert.equal(firstBattleOpeningCard(Number.NaN, DEFAULT_DECK, 6), "vanguard");
});
