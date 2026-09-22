import assert from "node:assert/strict";
import test from "node:test";
import { sampleUnitVitals } from "./unit-vitals";

test("damage holds the previous HP briefly before trailing down", () => {
  const initial = sampleUnitVitals(undefined, 100, 100, 0, 70, 0);
  const damaged = sampleUnitVitals(initial, 60, 100, 0, 70, 0.1);
  assert.equal(damaged.hpRatio, 0.6);
  assert.equal(damaged.trailHpRatio, 1);
  assert.equal(damaged.hpHoldUntil, 0.28);

  const held = sampleUnitVitals(damaged, 60, 100, 0, 70, 0.2);
  assert.equal(held.trailHpRatio, 1);

  const falling = sampleUnitVitals(held, 60, 100, 0, 70, 0.4);
  assert.ok(falling.trailHpRatio < 1);
  assert.ok(falling.trailHpRatio >= 0.6);
});

test("healing snaps the damage trail up immediately", () => {
  const initial = sampleUnitVitals(undefined, 100, 100, 0, 70, 0);
  const damaged = sampleUnitVitals(initial, 45, 100, 0, 70, 0.1);
  const healed = sampleUnitVitals(damaged, 80, 100, 0, 70, 0.2);
  assert.equal(healed.hpRatio, 0.8);
  assert.equal(healed.trailHpRatio, 0.8);
  assert.equal(healed.hpHoldUntil, 0.2);
});

test("shield loss has its own faster trail and shield gain snaps up", () => {
  const initial = sampleUnitVitals(undefined, 100, 100, 70, 70, 0);
  const hit = sampleUnitVitals(initial, 100, 100, 30, 70, 0.1);
  assert.equal(hit.shieldRatio, 30 / 70);
  assert.equal(hit.trailShieldRatio, 1);
  assert.equal(hit.shieldHoldUntil, 0.24);

  const falling = sampleUnitVitals(hit, 100, 100, 30, 70, 0.4);
  assert.ok(falling.trailShieldRatio < 1);
  assert.ok(falling.trailShieldRatio >= 30 / 70);

  const restored = sampleUnitVitals(falling, 100, 100, 70, 70, 0.5);
  assert.equal(restored.shieldRatio, 1);
  assert.equal(restored.trailShieldRatio, 1);
});

test("vitals clamp malformed values safely", () => {
  const sample = sampleUnitVitals(undefined, 140, 100, 90, 70, 0);
  assert.equal(sample.hpRatio, 1);
  assert.equal(sample.trailHpRatio, 1);
  assert.equal(sample.shieldRatio, 1);
  assert.equal(sample.trailShieldRatio, 1);
});
