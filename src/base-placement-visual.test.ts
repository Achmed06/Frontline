import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLearning } from "./headquarters";
import {
  constructOnPlot,
  moveBaseBuilding,
} from "./base-construction";
import { basePlacementVisual } from "./base-placement-visual";

const metrics = { wins: 24, stars: 72, mastery: 20, lessons: 4 };

test("new construction marks only exact constructable plots as valid", () => {
  const empty = normalizeLearning(null);
  const visual = basePlacementVisual(empty, "depot", metrics, "place");
  assert.equal(visual.states[12], "command");
  assert.equal(visual.states[6], "valid");
  assert.equal(visual.states[24], "valid");
  assert.equal(visual.validCount, 24);
});

test("chosen valid and invalid construction plots are explicit", () => {
  const empty = normalizeLearning(null);
  const valid = basePlacementVisual(empty, "depot", metrics, "place", 6);
  assert.equal(valid.states[6], "chosen-valid");
  assert.equal(valid.chosenValid, true);

  const invalid = basePlacementVisual(empty, "depot", metrics, "place", 12);
  assert.equal(invalid.states[12], "command");
  assert.equal(invalid.chosenValid, false);
});

test("occupied plots are blocked for a different new building", () => {
  const empty = normalizeLearning(null);
  const depot = constructOnPlot(empty, "depot", 7, metrics);
  const visual = basePlacementVisual(depot, "training", metrics, "place");
  assert.equal(visual.states[7], "occupied");
  assert.equal(visual.states[8], "valid");
  assert.equal(visual.validCount, 23);
});

test("upgrade telegraph keeps the predecessor plot as the only required target", () => {
  const empty = normalizeLearning(null);
  const depot = constructOnPlot(empty, "depot", 7, metrics);
  const visual = basePlacementVisual(depot, "supplyhub", metrics, "place");
  assert.equal(visual.states[7], "required");
  assert.equal(visual.states[8], "blocked");
  assert.equal(visual.validCount, 1);
});

test("move telegraph marks the current building as source and only free destinations valid", () => {
  let base = constructOnPlot(normalizeLearning(null), "depot", 7, metrics);
  base = constructOnPlot(base, "training", 9, metrics);
  const visual = basePlacementVisual(base, "depot", metrics, "move", 20);

  assert.equal(visual.states[7], "source");
  assert.equal(visual.states[9], "occupied");
  assert.equal(visual.states[12], "command");
  assert.equal(visual.states[20], "chosen-valid");
  assert.equal(visual.chosenValid, true);

  const moved = moveBaseBuilding(base, "depot", 20);
  assert.notEqual(moved, base);
});

test("locked project exposes no fake valid placement", () => {
  const empty = normalizeLearning(null);
  const visual = basePlacementVisual(
    empty,
    "depot",
    { ...metrics, wins: 0 },
    "place",
  );
  assert.equal(visual.validCount, 0);
  assert.equal(visual.states[6], "blocked");
});
