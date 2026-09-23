import assert from "node:assert/strict";
import test from "node:test";
import { pioneerCaptureVisual } from "./pioneer-capture-visual";

test("Pioneer completion uses the exact 48 capture radius and 1.5 multiplier", () => {
  const visual = pioneerCaptureVisual({
    type: "pioneer",
    life: 0.5,
    maxLife: 0.75,
    radius: 48,
    value: 1.5,
  });
  assert.ok(visual);
  assert.equal(visual.radius, 48);
  assert.equal(visual.multiplier, 1.5);
  assert.equal(visual.bonus, 1);
  assert.equal(visual.chevronCount, 5);
});

test("Pioneer completion expands outward through the secured point", () => {
  const early = pioneerCaptureVisual({
    type: "pioneer",
    life: 0.7,
    maxLife: 0.75,
    radius: 48,
    value: 1.5,
  })!;
  const late = pioneerCaptureVisual({
    type: "pioneer",
    life: 0.1,
    maxLife: 0.75,
    radius: 48,
    value: 1.5,
  })!;

  assert.ok(late.outerRadius > early.outerRadius);
  assert.ok(late.innerRadius > early.innerRadius);
  assert.ok(late.nodeRadius > early.nodeRadius);
  assert.ok(late.alpha < early.alpha);
});

test("malformed and non-Pioneer effects are ignored or sanitized", () => {
  assert.equal(
    pioneerCaptureVisual({
      type: "capture",
      life: 0.4,
      maxLife: 0.75,
      radius: 48,
      value: 1.5,
    }),
    null,
  );
  const fallback = pioneerCaptureVisual({
    type: "pioneer",
    life: 0.4,
    maxLife: 0.75,
    radius: Number.NaN,
    value: Number.NaN,
  })!;
  assert.equal(fallback.radius, 48);
  assert.equal(fallback.multiplier, 1.5);
});
