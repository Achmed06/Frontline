import assert from "node:assert/strict";
import test from "node:test";
import { healLinkVisual } from "./heal-link-visual";

test("targeted healing exposes a staged transfer path", () => {
  const visual = healLinkVisual({
    type: "heal",
    life: 0.225,
    maxLife: 0.45,
    value: 19,
    targetX: 200,
    targetY: 300,
  })!;

  assert.equal(visual.progress, 0.5);
  assert.equal(visual.alpha, 0.5);
  assert.ok(visual.intensity > 0.5);
  assert.ok(visual.sourceRadius > 6);
  assert.ok(visual.targetRadius > visual.sourceRadius);
  assert.ok(visual.packets.length >= 2);
  assert.ok(
    visual.packets.every(
      (packet) =>
        packet.progress >= 0 &&
        packet.progress <= 1 &&
        packet.alpha > 0,
    ),
  );
});

test("heal link ignores non-targeted and non-heal effects", () => {
  assert.equal(
    healLinkVisual({
      type: "heal",
      life: 0.3,
      maxLife: 0.45,
      value: 20,
    }),
    null,
  );
  assert.equal(
    healLinkVisual({
      type: "impact",
      life: 0.2,
      maxLife: 0.3,
      value: 20,
      targetX: 10,
      targetY: 20,
    }),
    null,
  );
});

test("heal link safely clamps malformed lifetime and healing values", () => {
  const visual = healLinkVisual({
    type: "heal",
    life: Number.NaN,
    maxLife: Number.NaN,
    value: Number.NaN,
    targetX: 10,
    targetY: 20,
  })!;
  assert.equal(visual.progress, 1);
  assert.equal(visual.alpha, 0);
  assert.ok(visual.intensity > 0);
  assert.equal(visual.packets.length, 0);
});
