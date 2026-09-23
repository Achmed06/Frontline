import assert from "node:assert/strict";
import test from "node:test";
import { coreTargetAcquisitionVisual } from "./core-target-acquisition-visual";

test("new Core target starts with a wide high-energy acquisition ring", () => {
  const visual = coreTargetAcquisitionVisual(0, 10);
  assert.equal(visual.active, true);
  assert.equal(visual.progress, 0);
  assert.ok(visual.ringRadius > 30);
  assert.ok(visual.alpha > 0.8);
  assert.equal(visual.scanT, 0);
  assert.equal(visual.sweepCount, 3);
});

test("handoff contracts toward the target while the scan packet advances", () => {
  const start = coreTargetAcquisitionVisual(0, 10);
  const mid = coreTargetAcquisitionVisual(0.24, 10);

  assert.equal(mid.active, true);
  assert.ok(mid.progress > 0.49 && mid.progress < 0.51);
  assert.ok(mid.ringRadius < start.ringRadius);
  assert.ok(mid.bracketReach < start.bracketReach);
  assert.ok(mid.scanT > 0.5);
  assert.ok(mid.alpha < start.alpha);
});

test("acquisition expires cleanly after the short handoff window", () => {
  const visual = coreTargetAcquisitionVisual(0.5, 12);
  assert.equal(visual.active, false);
  assert.equal(visual.progress, 1);
  assert.equal(visual.alpha, 0);
  assert.equal(visual.scanT, 1);
  assert.equal(visual.sweepCount, 0);
});

test("malformed timing and radius fail closed", () => {
  const visual = coreTargetAcquisitionVisual(
    Number.NaN,
    Number.NaN,
    Number.NaN,
  );
  assert.equal(visual.active, false);
  assert.equal(visual.ringRadius, 14);
  assert.equal(visual.alpha, 0);
});
