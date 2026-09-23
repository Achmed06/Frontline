import assert from "node:assert/strict";
import test from "node:test";
import { Match } from "./engine";
import { rallyCastVisual } from "./rally-cast-visual";

test("Rally cast uses exact 96 radius and 65 healing metadata", () => {
  const visual = rallyCastVisual({
    type: "rally",
    life: 0.4,
    maxLife: 0.8,
    radius: 96,
    value: 65,
    sourceCardId: "rally",
  });

  assert.ok(visual);
  assert.equal(visual.radius, 96);
  assert.equal(visual.healing, 65);
  assert.equal(visual.intensity, 1);
  assert.equal(visual.moveMultiplier, 1.25);
  assert.equal(visual.attackMultiplier, 1.3);
  assert.equal(visual.nodeCount, 8);
});

test("Rally command field expands outward and fades through release", () => {
  const early = rallyCastVisual({
    type: "rally",
    life: 0.74,
    maxLife: 0.8,
    radius: 96,
    value: 65,
    sourceCardId: "rally",
  })!;
  const late = rallyCastVisual({
    type: "rally",
    life: 0.1,
    maxLife: 0.8,
    radius: 96,
    value: 65,
    sourceCardId: "rally",
  })!;

  assert.ok(late.outerRadius > early.outerRadius);
  assert.ok(late.innerRadius > early.innerRadius);
  assert.ok(late.surgeRadius > early.surgeRadius);
  assert.ok(late.nodeRadius > early.nodeRadius);
  assert.ok(late.alpha < early.alpha);
});

test("real Rally play publishes exact radius and healing as presentation metadata", () => {
  const match = new Match({ botEnabled: false });
  match.state.energy.player = 10;

  const deploy = match.play("player", "vanguard", 210, 480);
  assert.equal(deploy.ok, true);
  const rally = match.play("player", "rally", 210, 480);
  assert.equal(rally.ok, true);

  const effect = match.state.effects.find(
    (item) => item.type === "rally" && item.sourceCardId === "rally",
  );
  assert.ok(effect);
  assert.equal(effect.radius, 96);
  assert.equal(effect.value, 65);

  const vanguard = match.state.units.find((unit) => unit.cardId === "vanguard");
  assert.ok(vanguard);
  assert.equal(vanguard.rallyTime, 6);
});

test("non-Rally and malformed effects are ignored safely", () => {
  assert.equal(
    rallyCastVisual({
      type: "pulse",
      life: 0.4,
      maxLife: 0.8,
      radius: 96,
      value: 65,
      sourceCardId: "pulse",
    }),
    null,
  );
  assert.equal(
    rallyCastVisual({
      type: "rally",
      life: Number.NaN,
      maxLife: 0.8,
      radius: 96,
      value: 65,
      sourceCardId: "rally",
    }),
    null,
  );
});
