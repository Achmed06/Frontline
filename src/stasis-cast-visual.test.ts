import assert from "node:assert/strict";
import test from "node:test";
import { Match } from "./engine";
import { stasisCastVisual } from "./stasis-cast-visual";

const STASIS_DECK = [
  "vanguard",
  "bulwark",
  "ranger",
  "swarm",
  "lancer",
  "medic",
  "stasis",
  "repulsor",
] as const;

test("Stasis cast uses exact 78 radius and 0.6 slow metadata", () => {
  const visual = stasisCastVisual({
    type: "stasis",
    life: 0.35,
    maxLife: 0.7,
    radius: 78,
    value: 0.6,
    sourceCardId: "stasis",
  });

  assert.ok(visual);
  assert.equal(visual.radius, 78);
  assert.equal(visual.boundaryRadius, 78);
  assert.equal(visual.slowFactor, 0.6);
  assert.equal(visual.severity, 1);
  assert.equal(visual.spokeCount, 6);
  assert.equal(visual.nodeCount, 6);
  assert.equal(visual.shardCount, 12);
});

test("Stasis suppression lattice expands outward and fades through release", () => {
  const early = stasisCastVisual({
    type: "stasis",
    life: 0.66,
    maxLife: 0.7,
    radius: 78,
    value: 0.6,
    sourceCardId: "stasis",
  })!;
  const late = stasisCastVisual({
    type: "stasis",
    life: 0.08,
    maxLife: 0.7,
    radius: 78,
    value: 0.6,
    sourceCardId: "stasis",
  })!;

  assert.ok(late.latticeRadius > early.latticeRadius);
  assert.ok(late.innerRadius > early.innerRadius);
  assert.ok(late.nodeRadius > early.nodeRadius);
  assert.ok(late.alpha < early.alpha);
});

test("real Stasis play publishes exact cast metadata and applies the real slow", () => {
  const match = new Match({
    botEnabled: false,
    playerDeck: STASIS_DECK,
    enemyDeck: STASIS_DECK,
  });
  match.state.energy.player = 10;
  match.state.energy.enemy = 10;

  const deploy = match.play("enemy", "vanguard", 210, 80);
  assert.equal(deploy.ok, true);
  const stasis = match.play("player", "stasis", 210, 80);
  assert.equal(stasis.ok, true);

  const effect = match.state.effects.find(
    (item) => item.type === "stasis" && item.sourceCardId === "stasis",
  );
  assert.ok(effect);
  assert.equal(effect.radius, 78);
  assert.equal(effect.value, 0.6);

  const target = match.state.units.find(
    (unit) => unit.team === "enemy" && unit.cardId === "vanguard",
  );
  assert.ok(target);
  assert.equal(target.slowTime, 4);
  assert.equal(target.slowFactor, 0.6);
});

test("non-Stasis and malformed effects are ignored safely", () => {
  assert.equal(
    stasisCastVisual({
      type: "repulsor",
      life: 0.35,
      maxLife: 0.7,
      radius: 78,
      value: 0.6,
      sourceCardId: "repulsor",
    }),
    null,
  );
  assert.equal(
    stasisCastVisual({
      type: "stasis",
      life: Number.NaN,
      maxLife: 0.7,
      radius: 78,
      value: 0.6,
      sourceCardId: "stasis",
    }),
    null,
  );
});
