import assert from "node:assert/strict";
import test from "node:test";
import { slowStatusVisual } from "./slow-status-visual";

test("active slow derives exact severity from slowFactor", () => {
  const visual = slowStatusVisual(4, 0.6);
  assert.equal(visual.active, true);
  assert.ok(Math.abs(visual.severity - 0.4) < 1e-12);
  assert.ok(visual.alpha > 0.5);
  assert.ok(visual.bandCount >= 5);
  assert.ok(visual.ringRadius > 16);
});

test("stronger slow produces denser and larger stasis geometry", () => {
  const light = slowStatusVisual(2, 0.8);
  const heavy = slowStatusVisual(2, 0.4);

  assert.ok(heavy.severity > light.severity);
  assert.ok(heavy.bandCount > light.bandCount);
  assert.ok(heavy.ringRadius > light.ringRadius);
  assert.ok(heavy.bracketReach > light.bracketReach);
  assert.ok(heavy.floorWidth > light.floorWidth);
});

test("final fraction fades toward release without changing severity", () => {
  const full = slowStatusVisual(2, 0.6);
  const ending = slowStatusVisual(0.2, 0.6);

  assert.equal(full.severity, ending.severity);
  assert.ok(ending.release > full.release);
  assert.ok(ending.alpha < full.alpha);
});

test("expired and malformed values produce no status visual", () => {
  assert.equal(slowStatusVisual(0, 0.6).active, false);
  assert.equal(slowStatusVisual(2, 1).active, false);
  assert.equal(
    slowStatusVisual(Number.NaN, Number.NaN).active,
    false,
  );
});
