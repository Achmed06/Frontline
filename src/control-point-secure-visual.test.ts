import assert from "node:assert/strict";
import test from "node:test";
import {
  CAPTURE_RADIUS,
  CAPTURE_SECONDS,
  Match,
} from "./engine";
import { controlPointSecureVisual } from "./control-point-secure-visual";

test("control-point secure visual uses canonical capture geometry and timing", () => {
  const visual = controlPointSecureVisual({
    type: "capture",
    life: 0.55,
    maxLife: 1.1,
    radius: CAPTURE_RADIUS,
    value: CAPTURE_SECONDS,
    sourceCardId: "control-point",
  });

  assert.ok(visual);
  assert.equal(visual.radius, CAPTURE_RADIUS);
  assert.equal(visual.captureSeconds, CAPTURE_SECONDS);
  assert.equal(visual.boundaryRadius, CAPTURE_RADIUS);
  assert.equal(visual.nodeCount, 6);
  assert.equal(visual.chevronCount, 3);
});

test("secure front expands through the exact objective area and fades", () => {
  const early = controlPointSecureVisual({
    type: "capture",
    life: 1.04,
    maxLife: 1.1,
    radius: CAPTURE_RADIUS,
    value: CAPTURE_SECONDS,
    sourceCardId: "control-point",
  })!;
  const late = controlPointSecureVisual({
    type: "capture",
    life: 0.08,
    maxLife: 1.1,
    radius: CAPTURE_RADIUS,
    value: CAPTURE_SECONDS,
    sourceCardId: "control-point",
  })!;

  assert.ok(late.secureRadius > early.secureRadius);
  assert.ok(late.innerRadius > early.innerRadius);
  assert.ok(late.alpha < early.alpha);
});

test("real capture publishes exact objective metadata", () => {
  const match = new Match({ botEnabled: false });
  assert.equal(match.play("player", "vanguard", 210, 410).ok, true);

  const unit = match.state.units.find(
    (entry) => entry.team === "player" && entry.cardId === "vanguard",
  );
  const point = match.state.points[4];
  assert.ok(unit);
  assert.ok(point);

  unit.x = point.x;
  unit.y = point.y;
  point.owner = null;
  point.capture = 0;
  point.captureTeam = null;

  for (let i = 0; i < 200 && point.owner !== "player"; i++)
    match.update(1 / 30);

  const effect = match.state.effects.find(
    (entry) =>
      entry.type === "capture" &&
      entry.sourceCardId === "control-point" &&
      entry.x === point.x &&
      entry.y === point.y,
  );
  assert.ok(effect);
  assert.equal(effect.radius, CAPTURE_RADIUS);
  assert.equal(effect.value, CAPTURE_SECONDS);
  assert.equal(point.owner, "player");
});

test("legacy and malformed capture effects are ignored safely", () => {
  assert.equal(
    controlPointSecureVisual({
      type: "capture",
      life: 0.55,
      maxLife: 1.1,
      radius: CAPTURE_RADIUS,
      value: CAPTURE_SECONDS,
      sourceCardId: undefined,
    }),
    null,
  );
  assert.equal(
    controlPointSecureVisual({
      type: "capture",
      life: Number.NaN,
      maxLife: 1.1,
      radius: CAPTURE_RADIUS,
      value: CAPTURE_SECONDS,
      sourceCardId: "control-point",
    }),
    null,
  );
});
