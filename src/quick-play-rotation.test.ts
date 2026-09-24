import assert from "node:assert/strict";
import test from "node:test";
import { quickPlayRotation } from "./quick-play-rotation";

test("first Quick Play keeps the forgiving rookie opening on the coast", () => {
  assert.deepEqual(quickPlayRotation(0), {
    theme: "coast",
    arenaName: "Smaragdküste",
    matchNumber: 1,
    difficulty: "rookie",
    difficultyLabel: "REKRUT",
  });
});

test("returning Quick Play rotates through all existing arenas", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((matches) => quickPlayRotation(matches).theme),
    ["frost", "ember", "nexus", "coast", "frost"],
  );
});

test("returning Quick Play stays on the standard tactical baseline", () => {
  for (const matches of [1, 2, 7, 99]) {
    const rotation = quickPlayRotation(matches);
    assert.equal(rotation.difficulty, "standard");
    assert.equal(rotation.difficultyLabel, "TAKTIKER");
  }
});

test("malformed match counts safely fall back to the first battle", () => {
  for (const matches of [Number.NaN, Number.POSITIVE_INFINITY, -4]) {
    const rotation = quickPlayRotation(matches);
    assert.equal(rotation.theme, "coast");
    assert.equal(rotation.matchNumber, 1);
    assert.equal(rotation.difficulty, "rookie");
  }
});
