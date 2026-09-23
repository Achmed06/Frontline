import assert from "node:assert/strict";
import test from "node:test";
import { Match } from "./engine";
import { repulsorCastVisual } from "./repulsor-cast-visual";

const REPULSOR_DECK = [
  "vanguard",
  "bulwark",
  "ranger",
  "swarm",
  "lancer",
  "medic",
  "pulse",
  "repulsor",
] as const;

test("Repulsor cast uses exact 72 radius and 55 push metadata", () => {
  const visual = repulsorCastVisual({
    type: "repulsor",
    life: 0.35,
    maxLife: 0.7,
    radius: 72,
    value: 55,
    sourceCardId: "repulsor",
  });

  assert.ok(visual);
  assert.equal(visual.radius, 72);
  assert.equal(visual.boundaryRadius, 72);
  assert.equal(visual.pushDistance, 55);
  assert.equal(visual.strength, 1);
  assert.equal(visual.spokeCount, 8);
});

test("Repulsor pressure wave expands outward and fades through release", () => {
  const early = repulsorCastVisual({
    type: "repulsor",
    life: 0.66,
    maxLife: 0.7,
    radius: 72,
    value: 55,
    sourceCardId: "repulsor",
  })!;
  const late = repulsorCastVisual({
    type: "repulsor",
    life: 0.08,
    maxLife: 0.7,
    radius: 72,
    value: 55,
    sourceCardId: "repulsor",
  })!;

  assert.ok(late.waveRadius > early.waveRadius);
  assert.ok(late.innerRadius > early.innerRadius);
  assert.ok(late.alpha < early.alpha);
});

test("real Repulsor play publishes exact cast metadata", () => {
  const match = new Match({
    botEnabled: false,
    playerDeck: REPULSOR_DECK,
    enemyDeck: REPULSOR_DECK,
  });
  match.state.energy.enemy = 10;
  assert.equal(match.play("enemy", "vanguard", 210, 150).ok, true);

  const target = match.state.units.find((unit) => unit.team === "enemy");
  assert.ok(target);

  match.state.energy.player = 10;
  assert.equal(match.play("player", "repulsor", target.x, target.y).ok, true);

  const effect = match.state.effects.find(
    (item) => item.type === "repulsor" && item.sourceCardId === "repulsor",
  );
  assert.ok(effect);
  assert.equal(effect.radius, 72);
  assert.equal(effect.value, 55);
});

test("non-Repulsor and malformed effects are ignored safely", () => {
  assert.equal(
    repulsorCastVisual({
      type: "stasis",
      life: 0.35,
      maxLife: 0.7,
      radius: 72,
      value: 55,
      sourceCardId: "stasis",
    }),
    null,
  );
  assert.equal(
    repulsorCastVisual({
      type: "repulsor",
      life: Number.NaN,
      maxLife: 0.7,
      radius: 72,
      value: 55,
      sourceCardId: "repulsor",
    }),
    null,
  );
});
