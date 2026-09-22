import assert from "node:assert/strict";
import test from "node:test";
import { movementFootprintVisual } from "./movement-footprint-visual";

test("heavy units leave the largest and strongest footprint", () => {
  const heavy = movementFootprintVisual("bulwark", 0.8);
  const standard = movementFootprintVisual("vanguard", 0.8);

  assert.equal(heavy.kind, "heavy");
  assert.equal(standard.kind, "standard");
  assert.ok(heavy.primaryWidth > standard.primaryWidth);
  assert.ok(heavy.dustAlpha > standard.dustAlpha);
  assert.ok(heavy.trailDistance > standard.trailDistance);
  assert.ok(heavy.settleWidthScale > standard.settleWidthScale);
});

test("siege units use narrow parallel track geometry", () => {
  const lancer = movementFootprintVisual("lancer", 0.7);
  const mortar = movementFootprintVisual("mortar", 0.7);

  assert.equal(lancer.kind, "siege");
  assert.equal(mortar.kind, "siege");
  assert.equal(lancer.segmentCount, 2);
  assert.ok(lancer.lateralOffset > 3);
  assert.ok(lancer.primaryHeight < lancer.primaryWidth);
});

test("swarm movement stays compact and light", () => {
  const swarm = movementFootprintVisual("swarm", 1.2);
  const heavy = movementFootprintVisual("sentinel", 1.2);

  assert.equal(swarm.kind, "swarm");
  assert.equal(swarm.segmentCount, 3);
  assert.ok(swarm.primaryWidth < heavy.primaryWidth);
  assert.ok(swarm.dustAlpha < heavy.dustAlpha);
  assert.ok(swarm.trailDistance < heavy.trailDistance);
});

test("malformed movement remains safe and deterministic", () => {
  const malformed = movementFootprintVisual("vanguard", Number.NaN);
  assert.equal(malformed.kind, "standard");
  assert.equal(malformed.trailDistance, 7);
  assert.equal(malformed.dustAlpha, 0.08);
});
