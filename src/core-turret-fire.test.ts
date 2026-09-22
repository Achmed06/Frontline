import assert from "node:assert/strict";
import test from "node:test";
import { coreTurretFireFeedback } from "./core-turret-fire";

test("core turret fire follows the actual target direction", () => {
  const down = coreTurretFireFeedback({
    type: "shot",
    sourceCardId: "core-turret",
    x: 210,
    y: 35,
    targetX: 210,
    targetY: 120,
    life: 0.25,
    maxLife: 0.25,
  });

  assert.equal(down.active, true);
  assert.ok(Math.abs(down.nx) < 1e-12);
  assert.ok(down.ny > 0.99);
  assert.ok(down.recoil > 4);
  assert.ok(down.flareRadius > 6);
});

test("core turret fire decays with the existing shot lifetime", () => {
  const full = coreTurretFireFeedback({
    type: "shot",
    sourceCardId: "core-turret",
    x: 0,
    y: 0,
    targetX: 100,
    targetY: 0,
    life: 0.25,
    maxLife: 0.25,
  });
  const half = coreTurretFireFeedback({
    type: "shot",
    sourceCardId: "core-turret",
    x: 0,
    y: 0,
    targetX: 100,
    targetY: 0,
    life: 0.125,
    maxLife: 0.25,
  });

  assert.equal(full.strength, 1);
  assert.equal(half.strength, 0.5);
  assert.ok(full.recoil > half.recoil);
  assert.ok(full.ventSpread > half.ventSpread);
});

test("non turret and malformed shots remain neutral", () => {
  assert.equal(
    coreTurretFireFeedback({
      type: "shot",
      sourceCardId: "ranger",
      x: 0,
      y: 0,
      targetX: 10,
      targetY: 0,
      life: 0.2,
      maxLife: 0.25,
    }).active,
    false,
  );

  const malformed = coreTurretFireFeedback({
    type: "shot",
    sourceCardId: "core-turret",
    x: 0,
    y: 0,
    targetX: Number.NaN,
    targetY: 0,
    life: Number.NaN,
    maxLife: Number.NaN,
  });
  assert.deepEqual(malformed, {
    active: false,
    nx: 0,
    ny: 0,
    strength: 0,
    recoil: 0,
    muzzleDistance: 0,
    flareRadius: 0,
    ventSpread: 0,
  });
});
