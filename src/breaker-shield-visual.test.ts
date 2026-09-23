import assert from "node:assert/strict";
import test from "node:test";
import { breakerShieldVisual } from "./breaker-shield-visual";

test("Breaker visual scales from the exact removed shield amount", () => {
  const light = breakerShieldVisual({
    type: "breaker",
    x: 100,
    y: 100,
    life: 0.42,
    maxLife: 0.42,
    value: 10,
  });
  const full = breakerShieldVisual({
    type: "breaker",
    x: 100,
    y: 100,
    life: 0.42,
    maxLife: 0.42,
    value: 45,
  });

  assert.ok(light);
  assert.ok(full);
  assert.equal(full?.removedShield, 45);
  assert.equal(full?.strength, 1);
  assert.ok((full?.slashReach ?? 0) > (light?.slashReach ?? 0));
  assert.ok((full?.fragmentCount ?? 0) > (light?.fragmentCount ?? 0));
});

test("Breaker slash follows the real attacker to target vector", () => {
  const visual = breakerShieldVisual({
    type: "breaker",
    x: 100,
    y: 100,
    sourceX: 60,
    sourceY: 100,
    life: 0.32,
    maxLife: 0.42,
    value: 45,
  });

  assert.equal(visual?.directional, true);
  assert.ok((visual?.nx ?? 0) > 0.99);
  assert.ok(Math.abs(visual?.ny ?? 1) < 1e-12);
  assert.ok(Math.abs(visual?.px ?? 1) < 1e-12);
  assert.ok((visual?.py ?? 0) > 0.99);
});

test("missing source keeps a safe symmetric fallback", () => {
  const visual = breakerShieldVisual({
    type: "breaker",
    x: 10,
    y: 20,
    life: 0.2,
    maxLife: 0.42,
    value: 20,
  });
  assert.equal(visual?.directional, false);
  assert.equal(visual?.nx, 0);
  assert.equal(visual?.ny, 0);
});

test("non Breaker effects are ignored", () => {
  assert.equal(
    breakerShieldVisual({
      type: "impact",
      x: 0,
      y: 0,
      life: 0.2,
      maxLife: 0.3,
      value: 20,
    }),
    null,
  );
});
