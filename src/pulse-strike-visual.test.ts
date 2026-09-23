import assert from "node:assert/strict";
import test from "node:test";
import { Match } from "./engine";
import { pulseStrikeVisual } from "./pulse-strike-visual";

test("Pulse strike expands to the exact gameplay radius", () => {
  const visual = pulseStrikeVisual({
    type: "pulse",
    life: 0.375,
    maxLife: 0.75,
    radius: 82,
    value: 85,
    sourceCardId: "pulse",
  });
  assert.ok(visual);
  assert.equal(visual.radius, 82);
  assert.equal(visual.intensity, 1);
  assert.ok(visual.shockRadius > 40);
  assert.equal(visual.spokeCount, 8);
});

test("Pulse strike grows outward and fades through its release", () => {
  const early = pulseStrikeVisual({
    type: "pulse",
    life: 0.7,
    maxLife: 0.75,
    radius: 82,
    value: 85,
    sourceCardId: "pulse",
  })!;
  const late = pulseStrikeVisual({
    type: "pulse",
    life: 0.12,
    maxLife: 0.75,
    radius: 82,
    value: 85,
    sourceCardId: "pulse",
  })!;

  assert.ok(late.shockRadius > early.shockRadius);
  assert.ok(late.secondaryRadius > early.secondaryRadius);
  assert.ok(late.alpha < early.alpha);
});

test("real Pulse play publishes exact range and damage as presentation metadata", () => {
  const match = new Match({
    botEnabled: false,
    playerDeck: [
      "vanguard",
      "bulwark",
      "ranger",
      "swarm",
      "lancer",
      "medic",
      "pulse",
      "rally",
    ],
  });
  match.state.energy.player = 10;

  const result = match.play("player", "pulse", 210, 280);
  assert.equal(result.ok, true);

  const effect = match.state.effects.find(
    (item) => item.type === "pulse" && item.sourceCardId === "pulse",
  );
  assert.ok(effect);
  assert.equal(effect.radius, 82);
  assert.equal(effect.value, 85);
});

test("non-Pulse and malformed effects are ignored safely", () => {
  assert.equal(
    pulseStrikeVisual({
      type: "blast",
      life: 0.5,
      maxLife: 0.75,
      radius: 82,
      value: 85,
      sourceCardId: "mortar",
    }),
    null,
  );
  assert.equal(
    pulseStrikeVisual({
      type: "pulse",
      life: Number.NaN,
      maxLife: 0.75,
      radius: 82,
      value: 85,
      sourceCardId: "pulse",
    }),
    null,
  );
});
