import assert from "node:assert/strict";
import test from "node:test";
import { Match } from "./engine";
import { mortarBlastVisual } from "./mortar-blast-visual";

const MORTAR_DECK = [
  "vanguard",
  "bulwark",
  "ranger",
  "swarm",
  "lancer",
  "mortar",
  "pulse",
  "rally",
] as const;

test("Mortar blast uses exact 42 radius and 28 splash damage", () => {
  const visual = mortarBlastVisual({
    type: "blast",
    life: 0.2,
    maxLife: 0.4,
    radius: 42,
    value: 28,
    sourceCardId: "mortar",
    x: 210,
    y: 280,
    sourceX: 210,
    sourceY: 360,
  });

  assert.ok(visual);
  assert.equal(visual.radius, 42);
  assert.equal(visual.damage, 28);
  assert.equal(visual.intensity, 1);
  assert.equal(visual.directional, true);
  assert.ok(visual.ny < -0.99);
});

test("Mortar shock front expands outward and fades through release", () => {
  const early = mortarBlastVisual({
    type: "blast",
    life: 0.38,
    maxLife: 0.4,
    radius: 42,
    value: 28,
    sourceCardId: "mortar",
    x: 210,
    y: 280,
  })!;
  const late = mortarBlastVisual({
    type: "blast",
    life: 0.05,
    maxLife: 0.4,
    radius: 42,
    value: 28,
    sourceCardId: "mortar",
    x: 210,
    y: 280,
  })!;

  assert.ok(late.shockRadius > early.shockRadius);
  assert.ok(late.innerRadius > early.innerRadius);
  assert.ok(late.alpha < early.alpha);
});

test("real Mortar attack publishes exact blast metadata", () => {
  const match = new Match({
    botEnabled: false,
    playerDeck: MORTAR_DECK,
    enemyDeck: MORTAR_DECK,
  });
  match.state.energy.player = 10;
  match.state.energy.enemy = 10;

  assert.equal(match.play("player", "mortar", 210, 480).ok, true);
  assert.equal(match.play("enemy", "vanguard", 210, 80).ok, true);

  const mortar = match.state.units.find(
    (unit) => unit.team === "player" && unit.cardId === "mortar",
  );
  const target = match.state.units.find(
    (unit) => unit.team === "enemy" && unit.cardId === "vanguard",
  );
  assert.ok(mortar);
  assert.ok(target);

  mortar.x = 210;
  mortar.y = 300;
  mortar.attackCooldown = 0;
  target.x = 210;
  target.y = 250;

  match.update(1 / 30);

  const blast = match.state.effects.find(
    (effect) => effect.type === "blast" && effect.sourceCardId === "mortar",
  );
  assert.ok(blast);
  assert.equal(blast.radius, 42);
  assert.equal(blast.value, 28);
  assert.equal(blast.sourceX, 210);
  assert.equal(blast.sourceY, 300);
});

test("non-Mortar and malformed blast effects are ignored safely", () => {
  assert.equal(
    mortarBlastVisual({
      type: "blast",
      life: 0.2,
      maxLife: 0.4,
      radius: 42,
      value: 28,
      sourceCardId: "pulse",
      x: 0,
      y: 0,
    }),
    null,
  );
  assert.equal(
    mortarBlastVisual({
      type: "blast",
      life: Number.NaN,
      maxLife: 0.4,
      radius: 42,
      value: 28,
      sourceCardId: "mortar",
      x: 0,
      y: 0,
    }),
    null,
  );
});
