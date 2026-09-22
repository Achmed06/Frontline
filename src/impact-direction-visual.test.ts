import assert from "node:assert/strict";
import test from "node:test";
import { impactDirectionVisual } from "./impact-direction-visual";

test("impact direction points away from the real attack source", () => {
  const visual = impactDirectionVisual({
    type: "impact",
    x: 100,
    y: 100,
    sourceX: 60,
    sourceY: 100,
    life: 0.24,
    maxLife: 0.24,
    radius: 14,
  });

  assert.equal(visual.active, true);
  assert.ok(visual.nx > 0.99);
  assert.ok(Math.abs(visual.ny) < 1e-12);
  assert.ok(Math.abs(visual.px) < 1e-12);
  assert.ok(visual.py > 0.99);
  assert.ok(visual.bias > 0.35);
});

test("directional emphasis decays with the existing impact lifetime", () => {
  const full = impactDirectionVisual({
    type: "impact",
    x: 0,
    y: 0,
    sourceX: 0,
    sourceY: -30,
    life: 0.24,
    maxLife: 0.24,
    radius: 18,
  });
  const late = impactDirectionVisual({
    type: "impact",
    x: 0,
    y: 0,
    sourceX: 0,
    sourceY: -30,
    life: 0.06,
    maxLife: 0.24,
    radius: 18,
  });

  assert.ok(full.intensity > late.intensity);
  assert.ok(full.bias > late.bias);
  assert.equal(full.active, true);
  assert.equal(late.active, true);
});

test("missing or coincident source keeps the radial fallback", () => {
  assert.equal(
    impactDirectionVisual({
      type: "impact",
      x: 10,
      y: 20,
      life: 0.2,
      maxLife: 0.24,
      radius: 12,
    }).active,
    false,
  );
  assert.equal(
    impactDirectionVisual({
      type: "impact",
      x: 10,
      y: 20,
      sourceX: 10,
      sourceY: 20,
      life: 0.2,
      maxLife: 0.24,
      radius: 12,
    }).active,
    false,
  );
});

test("malformed timing and radius stay bounded", () => {
  const visual = impactDirectionVisual({
    type: "impact",
    x: 0,
    y: 0,
    sourceX: -10,
    sourceY: 0,
    life: Number.NaN,
    maxLife: Number.NaN,
    radius: Number.POSITIVE_INFINITY,
  });

  assert.equal(visual.active, false);
  assert.equal(visual.intensity, 0);
  assert.equal(visual.bias, 0);
});
