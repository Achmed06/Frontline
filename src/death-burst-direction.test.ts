import assert from "node:assert/strict";
import test from "node:test";
import { deathBurstDirection } from "./death-burst-direction";

test("death burst points away from the real damage source", () => {
  const visual = deathBurstDirection({
    type: "death",
    x: 100,
    y: 100,
    sourceX: 100,
    sourceY: 60,
    life: 0.62,
    maxLife: 0.62,
    radius: 24,
  });

  assert.equal(visual.active, true);
  assert.ok(Math.abs(visual.nx) < 1e-12);
  assert.ok(visual.ny > 0.99);
  assert.ok(visual.bias > 0.4);
  assert.ok(visual.stretch > 1);
  assert.ok(visual.offset > 0);
});

test("directional death bias decays with the existing death lifetime", () => {
  const full = deathBurstDirection({
    type: "death",
    x: 0,
    y: 0,
    sourceX: -20,
    sourceY: 0,
    life: 0.62,
    maxLife: 0.62,
    radius: 30,
  });
  const half = deathBurstDirection({
    type: "death",
    x: 0,
    y: 0,
    sourceX: -20,
    sourceY: 0,
    life: 0.31,
    maxLife: 0.62,
    radius: 30,
  });

  assert.ok(full.bias > half.bias);
  assert.ok(full.offset > half.offset);
  assert.ok(full.stretch > half.stretch);
});

test("missing or coincident source keeps the existing radial fallback", () => {
  const missing = deathBurstDirection({
    type: "death",
    x: 10,
    y: 20,
    life: 0.5,
    maxLife: 0.62,
    radius: 18,
  });
  assert.equal(missing.active, false);
  assert.equal(missing.stretch, 1);

  const coincident = deathBurstDirection({
    type: "death",
    x: 10,
    y: 20,
    sourceX: 10,
    sourceY: 20,
    life: 0.5,
    maxLife: 0.62,
    radius: 18,
  });
  assert.equal(coincident.active, false);
  assert.equal(coincident.bias, 0);
});

test("malformed timing stays bounded", () => {
  const malformed = deathBurstDirection({
    type: "death",
    x: 0,
    y: 0,
    sourceX: -10,
    sourceY: 0,
    life: Number.NaN,
    maxLife: Number.NaN,
    radius: Number.POSITIVE_INFINITY,
  });

  assert.equal(malformed.active, false);
  assert.equal(malformed.bias, 0);
  assert.equal(malformed.offset, 0);
});
