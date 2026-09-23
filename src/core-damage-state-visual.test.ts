import assert from "node:assert/strict";
import test from "node:test";
import { coreDamageStateVisual } from "./core-damage-state-visual";

test("healthy Core adds no mechanical damage clutter", () => {
  const visual = coreDamageStateVisual(0.8);
  assert.equal(visual.state, "stable");
  assert.equal(visual.exposedSeams, 0);
  assert.equal(visual.ventCount, 0);
  assert.equal(visual.sparkCount, 0);
  assert.equal(visual.armorGap, 0);
});

test("damaged Core progressively exposes armor seams and vents", () => {
  const early = coreDamageStateVisual(0.58);
  const late = coreDamageStateVisual(0.34);

  assert.equal(early.state, "damaged");
  assert.equal(late.state, "damaged");
  assert.ok(late.exposedSeams >= early.exposedSeams);
  assert.ok(late.armorGap > early.armorGap);
  assert.ok(late.conduitAlpha > early.conduitAlpha);
  assert.ok(late.sparkCount >= early.sparkCount);
});

test("critical Core has a stronger but still active mechanical damage signature", () => {
  const damaged = coreDamageStateVisual(0.4);
  const critical = coreDamageStateVisual(0.2);

  assert.equal(critical.state, "critical");
  assert.ok(critical.exposedSeams > damaged.exposedSeams);
  assert.ok(critical.ventCount > damaged.ventCount);
  assert.ok(critical.warningAlpha > damaged.warningAlpha);
  assert.ok(critical.debrisCount > damaged.debrisCount);
});

test("destroyed and malformed fractions remain deterministic", () => {
  const destroyed = coreDamageStateVisual(0);
  const malformed = coreDamageStateVisual(Number.NaN);

  assert.equal(destroyed.state, "destroyed");
  assert.equal(destroyed.fraction, 0);
  assert.equal(malformed.state, "stable");
  assert.equal(malformed.fraction, 1);
});
