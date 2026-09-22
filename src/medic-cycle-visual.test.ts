import assert from "node:assert/strict";
import test from "node:test";
import { medicCycleVisual } from "./medic-cycle-visual";

test("medic cycle exposes exact support cooldown progress", () => {
  const visual = medicCycleVisual("medic", 0.55, 1.1);

  assert.equal(visual.active, true);
  assert.equal(visual.ready, false);
  assert.equal(visual.charge, 0.5);
  assert.equal(visual.remaining, 0.5);
  assert.equal(visual.filledSegments, 4);
});

test("ready medic fills the cycle and exposes all nanite packets", () => {
  const visual = medicCycleVisual("medic", 0, 1.1);

  assert.equal(visual.ready, true);
  assert.equal(visual.charge, 1);
  assert.equal(visual.filledSegments, visual.segmentCount);
  assert.equal(visual.packetCount, 3);
  assert.ok(visual.crossReach > 5);
});

test("non medic units do not add support-cycle clutter", () => {
  const visual = medicCycleVisual("ranger", 0.2, 1.1);

  assert.equal(visual.active, false);
  assert.equal(visual.segmentCount, 0);
  assert.equal(visual.alpha, 0);
});

test("malformed cooldown stays safely uncharged", () => {
  const visual = medicCycleVisual(
    "medic",
    Number.NaN,
    Number.NaN,
  );

  assert.equal(visual.active, true);
  assert.equal(visual.ready, false);
  assert.equal(visual.charge, 0);
  assert.equal(visual.remaining, 1);
  assert.equal(visual.filledSegments, 0);
});
