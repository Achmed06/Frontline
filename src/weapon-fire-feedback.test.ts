import assert from "node:assert/strict";
import test from "node:test";
import { weaponFireDirection, weaponFireFeedback } from "./weapon-fire-feedback";

test("heavy weapons recoil harder than precision weapons", () => {
  const ranger = weaponFireFeedback("ranger", 0.26, 0.26);
  const mortar = weaponFireFeedback("mortar", 0.26, 0.26);
  const sentinel = weaponFireFeedback("sentinel", 0.26, 0.26);

  assert.equal(ranger.kind, "precision");
  assert.equal(mortar.kind, "explosive");
  assert.equal(sentinel.kind, "heavy");
  assert.ok(Math.abs(mortar.displacement) > Math.abs(ranger.displacement));
  assert.ok(Math.abs(sentinel.displacement) > Math.abs(ranger.displacement));
  assert.ok(mortar.muzzleRadius > ranger.muzzleRadius);
});

test("melee and breach attacks lunge forward and never draw muzzle fire", () => {
  const vanguard = weaponFireFeedback("vanguard", 0.26, 0.26);
  const breaker = weaponFireFeedback("breaker", 0.26, 0.26);

  assert.equal(vanguard.kind, "melee");
  assert.equal(breaker.kind, "breach");
  assert.ok(vanguard.displacement > 0);
  assert.ok(breaker.displacement > vanguard.displacement);
  assert.equal(vanguard.muzzleRays, 0);
  assert.equal(breaker.muzzleLength, 0);
});

test("fire feedback decays with the existing shot lifetime", () => {
  const full = weaponFireFeedback("lancer", 0.26, 0.26);
  const half = weaponFireFeedback("lancer", 0.13, 0.26);
  const done = weaponFireFeedback("lancer", 0, 0.26);

  assert.equal(full.strength, 1);
  assert.equal(half.strength, 0.5);
  assert.equal(done.strength, 0);
  assert.ok(Math.abs(full.displacement) > Math.abs(half.displacement));
  assert.equal(done.scale, 1);
  assert.equal(done.muzzleLength, 0);
});

test("malformed timing stays neutral and bounded", () => {
  const malformed = weaponFireFeedback(
    "mortar",
    Number.NaN,
    Number.NaN,
  );
  assert.equal(malformed.strength, 0);
  assert.equal(malformed.displacement, 0);
  assert.equal(malformed.scale, 1);
  assert.equal(malformed.widthScale, 1);
  assert.equal(malformed.heightScale, 1);
});


test("live fire direction follows the current visible target and controls facing", () => {
  const right = weaponFireDirection(100, 100, 140, 120, -1);
  assert.ok(right.nx > 0);
  assert.ok(right.ny > 0);
  assert.equal(right.facing, 1);

  const left = weaponFireDirection(100, 100, 70, 80, 1);
  assert.ok(left.nx < 0);
  assert.ok(left.ny < 0);
  assert.equal(left.facing, -1);
});

test("near-vertical and coincident fire keep the previous horizontal facing", () => {
  const vertical = weaponFireDirection(100, 100, 100.4, 60, -1);
  assert.equal(vertical.facing, -1);
  assert.ok(vertical.ny < -0.99);

  const coincident = weaponFireDirection(100, 100, 100, 100, -1);
  assert.equal(coincident.distance, 0);
  assert.equal(coincident.nx, 0);
  assert.equal(coincident.ny, 0);
  assert.equal(coincident.facing, -1);
});
