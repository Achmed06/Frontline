import assert from "node:assert/strict";
import test from "node:test";
import { nextBattleProgress } from "./battle-progress";
import { normalizeLearning } from "./headquarters";
import { normalizeMastery } from "./mastery";
import { DEFAULT_DECK } from "./engine";

test("incomplete field training is prioritized over mastery", () => {
  const learning = normalizeLearning({
    counts: { deploy: 2, capture: 0, ability: 0, win: 0 },
  });
  const mastery = normalizeMastery({
    units: { vanguard: 4 },
  });
  const cue = nextBattleProgress(learning, mastery, DEFAULT_DECK);
  assert.equal(cue?.kind, "learning");
  assert.equal(cue?.title, "Eine Front aufstellen");
  assert.equal(cue?.current, 2);
  assert.equal(cue?.goal, 3);
});

test("after training, nearest deck mastery frame becomes the next target", () => {
  const learning = normalizeLearning({
    counts: { deploy: 3, capture: 1, ability: 1, win: 1 },
  });
  const mastery = normalizeMastery({
    units: { vanguard: 4, bulwark: 1, ranger: 0 },
  });
  const cue = nextBattleProgress(learning, mastery, DEFAULT_DECK);
  assert.equal(cue?.kind, "mastery");
  assert.equal(cue?.cardId, "vanguard");
  assert.equal(cue?.current, 4);
  assert.equal(cue?.goal, 5);
  assert.match(cue?.title ?? "", /Silber/);
});

test("mastery target only considers units in the active deck", () => {
  const learning = normalizeLearning({
    counts: { deploy: 3, capture: 1, ability: 1, win: 1 },
  });
  const mastery = normalizeMastery({
    units: { sentinel: 4, vanguard: 1 },
  });
  const cue = nextBattleProgress(learning, mastery, DEFAULT_DECK);
  assert.notEqual(cue?.cardId, "sentinel");
});

test("fully mastered deck has no fake next-progress target", () => {
  const learning = normalizeLearning({
    counts: { deploy: 3, capture: 1, ability: 1, win: 1 },
  });
  const mastery = normalizeMastery({
    units: {
      vanguard: 15,
      bulwark: 15,
      ranger: 15,
      swarm: 15,
      lancer: 15,
      medic: 15,
    },
  });
  assert.equal(nextBattleProgress(learning, mastery, DEFAULT_DECK), null);
});
