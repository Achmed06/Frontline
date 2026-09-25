import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_DECK } from "./engine";
import { firstBattleOpeningCard, openingUnitCard, rematchOpeningCard } from "./first-battle-opening";

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

test("shared opening selector can prepare a returning rematch without auto-playing it", () => {
  assert.equal(openingUnitCard(DEFAULT_DECK, 6), "vanguard");
  assert.equal(openingUnitCard(["pulse", "ranger", "bulwark"], 3), "ranger");
  assert.equal(openingUnitCard(["pulse", "bulwark", "rally"], 3), null);
});

test("direct rematches preserve the player's previous affordable opener", () => {
  assert.equal(rematchOpeningCard(DEFAULT_DECK, 6, "swarm"), "swarm");
  assert.equal(rematchOpeningCard(DEFAULT_DECK, 6, "ranger"), "ranger");
  assert.equal(rematchOpeningCard(DEFAULT_DECK, 6, "vanguard"), "vanguard");
});

test("rematch opener falls back when the previous card is missing or unaffordable", () => {
  assert.equal(
    rematchOpeningCard(["vanguard", "ranger", "pulse", "rally", "bulwark", "medic", "lancer", "swarm"], 2, "ranger"),
    "vanguard",
  );
  assert.equal(
    rematchOpeningCard(["ranger", "bulwark", "pulse", "rally", "medic", "lancer", "sentinel", "swarm"], 3, "raider"),
    "ranger",
  );
});

test("rematch opener never preserves an ability as the opening unit", () => {
  assert.equal(rematchOpeningCard(DEFAULT_DECK, 6, "pulse"), "vanguard");
});
