import assert from "node:assert/strict";
import test from "node:test";
import { coreTurretAimVisual } from "./core-turret-aim-visual";

test("core turret aim uses the real target vector", () => {
  const visual = coreTurretAimVisual(100, 100, 140, 100, 0.5);

  assert.equal(visual.active, true);
  assert.ok(visual.nx > 0.99);
  assert.ok(Math.abs(visual.ny) < 1e-12);
  assert.ok(Math.abs(visual.px) < 1e-12);
  assert.ok(visual.py > 0.99);
  assert.ok(Math.abs(visual.angle) < 1e-12);
});

test("barrel extends and strengthens from reload toward lock", () => {
  const reload = coreTurretAimVisual(0, 0, 0, -100, 0.9);
  const track = coreTurretAimVisual(0, 0, 0, -100, 0.5);
  const lock = coreTurretAimVisual(0, 0, 0, -100, 0.1);

  assert.equal(reload.phase, "reload");
  assert.equal(track.phase, "track");
  assert.equal(lock.phase, "lock");
  assert.ok(track.barrelLength > reload.barrelLength);
  assert.ok(lock.barrelLength > track.barrelLength);
  assert.ok(lock.barrelWidth > reload.barrelWidth);
  assert.ok(lock.muzzleRadius > track.muzzleRadius);
});

test("head offset follows the same exact reload charge", () => {
  const early = coreTurretAimVisual(10, 10, 20, 20, 0.8);
  const late = coreTurretAimVisual(10, 10, 20, 20, 0.2);

  assert.ok(late.charge > early.charge);
  assert.ok(late.headOffset > early.headOffset);
  assert.ok(late.prongSpread > early.prongSpread);
});

test("missing, coincident and malformed targets stay neutral", () => {
  assert.equal(
    coreTurretAimVisual(0, 0, undefined, undefined, 0.5).active,
    false,
  );
  assert.equal(
    coreTurretAimVisual(10, 10, 10, 10, 0.5).active,
    false,
  );
  assert.equal(
    coreTurretAimVisual(Number.NaN, 0, 10, 10, 0.5).active,
    false,
  );
});
