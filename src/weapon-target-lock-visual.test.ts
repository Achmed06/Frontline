import assert from "node:assert/strict";
import test from "node:test";
import { weaponTargetLockVisual } from "./weapon-target-lock-visual";

test("Lancer lock appears late in the real reload cycle and contracts toward target", () => {
  const early = weaponTargetLockVisual(
    "lancer",
    1.1,
    2.2,
    true,
    0,
    0,
    100,
    0,
    10,
  );
  const late = weaponTargetLockVisual(
    "lancer",
    0.22,
    2.2,
    true,
    0,
    0,
    100,
    0,
    10,
  );

  assert.equal(early.active, false);
  assert.equal(late.active, true);
  assert.ok(late.charge > 0.89);
  assert.ok(late.lock > 0.7);
  assert.ok(late.nx > 0.99);
  assert.ok(Math.abs(late.ny) < 1e-12);
  assert.ok(late.bracketRadius < 20);
  assert.ok(late.targetPulse > 0);
});

test("high-impact profiles keep distinct targeting prominence", () => {
  const rail = weaponTargetLockVisual(
    "lancer",
    0.1,
    2.2,
    true,
    0,
    0,
    0,
    -100,
    10,
  );
  const heavy = weaponTargetLockVisual(
    "sentinel",
    0.05,
    1.1,
    true,
    0,
    0,
    0,
    -100,
    10,
  );
  const electric = weaponTargetLockVisual(
    "disruptor",
    0.05,
    1.3,
    true,
    0,
    0,
    0,
    -100,
    10,
  );

  assert.equal(rail.active, true);
  assert.equal(heavy.active, true);
  assert.equal(electric.active, true);
  assert.ok(rail.prominence > heavy.prominence);
  assert.ok(heavy.prominence > electric.prominence);
  assert.ok(rail.dashCount > electric.dashCount);
});

test("out-of-range and fast weapon targets do not add lock clutter", () => {
  assert.equal(
    weaponTargetLockVisual(
      "mortar",
      0,
      1.8,
      false,
      0,
      0,
      100,
      0,
      10,
    ).active,
    false,
  );
  assert.equal(
    weaponTargetLockVisual(
      "ranger",
      0,
      0.95,
      true,
      0,
      0,
      100,
      0,
      10,
    ).active,
    false,
  );
});

test("coincident and malformed vectors stay neutral", () => {
  assert.equal(
    weaponTargetLockVisual(
      "lancer",
      0,
      2.2,
      true,
      10,
      10,
      10,
      10,
      10,
    ).active,
    false,
  );
  assert.equal(
    weaponTargetLockVisual(
      "lancer",
      Number.NaN,
      Number.NaN,
      true,
      0,
      0,
      Number.NaN,
      10,
      10,
    ).active,
    false,
  );
});
