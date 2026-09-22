import assert from "node:assert/strict";
import test from "node:test";
import { Match } from "./engine";
import { unitHitReaction } from "./unit-hit-reaction";

test("directional hit reaction pushes visually away from the attack source", () => {
  const right = unitHitReaction({
    type: "impact",
    x: 100,
    y: 100,
    sourceX: 60,
    sourceY: 100,
    life: 0.24,
    maxLife: 0.24,
    radius: 18,
  });
  assert.ok(right.offsetX > 5);
  assert.ok(Math.abs(right.offsetY) < 1e-9);
  assert.ok(right.angle > 0);
  assert.ok(right.widthScale > 1);
  assert.ok(right.heightScale < 1);

  const up = unitHitReaction({
    type: "impact",
    x: 100,
    y: 80,
    sourceX: 100,
    sourceY: 120,
    life: 0.12,
    maxLife: 0.24,
    radius: 9,
  });
  assert.ok(up.offsetY < 0);
  assert.ok(Math.abs(up.offsetX) < 1e-9);
  assert.ok(Math.abs(up.angle) < 1e-9);
  assert.ok(up.intensity > 0 && up.intensity < right.intensity);
});

test("hit reaction is neutral without a usable impact source", () => {
  const neutral = {
    offsetX: 0,
    offsetY: 0,
    angle: 0,
    widthScale: 1,
    heightScale: 1,
    intensity: 0,
  };
  assert.deepEqual(unitHitReaction(undefined), neutral);
  assert.deepEqual(
    unitHitReaction({
      type: "impact",
      x: 100,
      y: 100,
      life: 0.2,
      maxLife: 0.24,
      radius: 12,
    }),
    neutral,
  );
  assert.deepEqual(
    unitHitReaction({
      type: "heal",
      x: 100,
      y: 100,
      sourceX: 80,
      sourceY: 100,
      life: 0.2,
      maxLife: 0.24,
      radius: 12,
    }),
    neutral,
  );
});

test("Pulse impact preserves its cast center as visual hit source", () => {
  const match = new Match({ botEnabled: false });
  assert.equal(match.play("enemy", "vanguard", 210, 110).ok, true);
  assert.equal(match.play("player", "pulse", 190, 110).ok, true);
  const impact = match.state.effects.find(
    (effect) => effect.type === "impact",
  );
  assert.ok(impact);
  assert.equal(impact.sourceCardId, "pulse");
  assert.equal(impact.sourceX, 190);
  assert.equal(impact.sourceY, 110);
  assert.equal(impact.x, 210);
  assert.equal(impact.y, 110);
});

test("reaction clamps malformed lifetime and radius without impossible scale", () => {
  const reaction = unitHitReaction({
    type: "impact",
    x: 120,
    y: 100,
    sourceX: 100,
    sourceY: 100,
    life: 999,
    maxLife: Number.NaN,
    radius: 999,
  });
  assert.equal(reaction.intensity, 1);
  assert.equal(reaction.widthScale, 1.055);
  assert.equal(reaction.heightScale, 0.968);
  assert.ok(reaction.offsetX <= 5.2);
});
