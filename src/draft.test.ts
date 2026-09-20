import test from "node:test";
import assert from "node:assert/strict";
import { draftOffers } from "./draft";
import { CARDS, Match, isValidDeck, type CardId } from "./engine";
test("draft offers only eligible cards and completes valid mirrored decks without duplicates", () => {
  for (let seed = 1; seed <= 12; seed++) {
    let value = seed;
    const random = () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
    const picks: CardId[] = [];
    for (let round = 0; round < 8; round++) {
      const offers = draftOffers(picks, random);
      assert.equal(offers.length, 3);
      assert.equal(new Set(offers).size, 3);
      for (const id of offers) {
        assert.equal(picks.includes(id), false);
        assert.equal(CARDS.find(c => c.id === id)!.kind, round < 6 ? "unit" : "ability");
      }
      picks.push(offers[round % 3]);
    }
    assert.ok(isValidDeck(picks));
    assert.deepEqual(draftOffers(picks), []);
    const match = new Match({ playerDeck: picks });
    assert.deepEqual(match.decks.enemy, picks);
  }
});
