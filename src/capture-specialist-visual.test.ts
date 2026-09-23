import assert from "node:assert/strict";
import test from "node:test";
import { captureSpecialistVisual } from "./capture-specialist-visual";

test("Pioneer 1.5x capture multiplier produces a full specialist signature", () => {
  const visual = captureSpecialistVisual({
    mode: "capture",
    capturer: "player",
    captureMultiplier: 1.5,
    groupMultiplier: 1,
  });

  assert.equal(visual.active, true);
  assert.equal(visual.specialistBoost, 1);
  assert.equal(visual.totalMultiplier, 1.5);
  assert.equal(visual.nodeCount, 6);
  assert.equal(visual.chevronCount, 4);
  assert.ok(visual.ringRadius > 50);
});

test("group support increases total speed without pretending to be extra specialist strength", () => {
  const solo = captureSpecialistVisual({
    mode: "capture",
    capturer: "player",
    captureMultiplier: 1.5,
    groupMultiplier: 1,
  });
  const grouped = captureSpecialistVisual({
    mode: "capture",
    capturer: "player",
    captureMultiplier: 1.5,
    groupMultiplier: 1.3,
  });

  assert.equal(grouped.specialistBoost, solo.specialistBoost);
  assert.ok(grouped.totalMultiplier > solo.totalMultiplier);
  assert.ok(grouped.pulseScale > solo.pulseScale);
});

test("ordinary capture and reverse states add no specialist clutter", () => {
  assert.equal(
    captureSpecialistVisual({
      mode: "capture",
      capturer: "enemy",
      captureMultiplier: 1,
      groupMultiplier: 1.3,
    }).active,
    false,
  );
  assert.equal(
    captureSpecialistVisual({
      mode: "reverse",
      capturer: "player",
      captureMultiplier: 1.5,
      groupMultiplier: 1,
    }).active,
    false,
  );
});

test("malformed multipliers fall back safely", () => {
  const visual = captureSpecialistVisual({
    mode: "capture",
    capturer: "player",
    captureMultiplier: Number.NaN,
    groupMultiplier: Number.NaN,
  });

  assert.equal(visual.active, false);
  assert.equal(visual.specialistBoost, 0);
  assert.equal(visual.totalMultiplier, 1);
});
