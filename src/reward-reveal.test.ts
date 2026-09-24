import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLearning } from "./headquarters";
import { normalizeMastery } from "./mastery";
import { rewardReveal } from "./reward-reveal";

test("Aurora unlock outranks other same-match milestones", () => {
  const beforeLearning = normalizeLearning({ counts: { deploy: 3, capture: 1, ability: 1, win: 0 } });
  const afterLearning = normalizeLearning({ counts: { deploy: 3, capture: 1, ability: 1, win: 1 } });
  const beforeMastery = normalizeMastery({ units: { vanguard: 4 } });
  const afterMastery = normalizeMastery({ units: { vanguard: 5 } });
  const reveal = rewardReveal(beforeLearning, afterLearning, beforeMastery, afterMastery, 0, 1);
  assert.equal(reveal?.kind, "style");
  assert.equal(reveal?.title, "AURORA");
  assert.equal(reveal?.extraCount, 3);
});

test("HQ upgrade is highlighted when no style unlock outranks it", () => {
  const learning = normalizeLearning({ counts: { deploy: 0, capture: 0, ability: 0, win: 0 } });
  const mastery = normalizeMastery({});
  const reveal = rewardReveal(learning, learning, mastery, mastery, 0, 1);
  assert.equal(reveal?.kind, "base");
  assert.equal(reveal?.title, "BRÜCKENKOPF");
  assert.equal(reveal?.badge, "HQ 2");
});

test("new mastery frame becomes the reveal when it is the highest milestone", () => {
  const learning = normalizeLearning({ counts: { deploy: 0, capture: 0, ability: 0, win: 0 } });
  const before = normalizeMastery({ units: { ranger: 4 } });
  const after = normalizeMastery({ units: { ranger: 5 } });
  const reveal = rewardReveal(learning, learning, before, after, 0, 0);
  assert.equal(reveal?.kind, "mastery");
  assert.equal(reveal?.cardId, "ranger");
  assert.match(reveal?.title ?? "", /Silber/);
});

test("single completed learning task produces a compact lesson reveal", () => {
  const before = normalizeLearning({ counts: { deploy: 2, capture: 0, ability: 0, win: 0 } });
  const after = normalizeLearning({ counts: { deploy: 3, capture: 0, ability: 0, win: 0 } });
  const mastery = normalizeMastery({});
  const reveal = rewardReveal(before, after, mastery, mastery, 0, 0);
  assert.equal(reveal?.kind, "lesson");
  assert.equal(reveal?.badge, "1/4");
});

test("no real milestone returns no reveal", () => {
  const learning = normalizeLearning({ counts: { deploy: 1, capture: 0, ability: 0, win: 0 } });
  const mastery = normalizeMastery({ units: { vanguard: 2 } });
  assert.equal(rewardReveal(learning, learning, mastery, mastery, 0, 0), null);
});
