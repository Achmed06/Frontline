import assert from "node:assert/strict";
import test from "node:test";
import { Match, type Unit } from "./engine";
import { stasisHitVisual } from "./stasis-hit-visual";

test("Stasis hit contracts around the affected unit and preserves the 40 percent slow", () => {
  const early = stasisHitVisual({
    type: "stasis-hit",
    life: 0.55,
    maxLife: 0.58,
    radius: 10,
    value: 0.6,
    sourceCardId: "stasis",
    x: 250,
    y: 280,
    sourceX: 210,
    sourceY: 280,
  })!;
  const late = stasisHitVisual({
    type: "stasis-hit",
    life: 0.12,
    maxLife: 0.58,
    radius: 10,
    value: 0.6,
    sourceCardId: "stasis",
    x: 250,
    y: 280,
    sourceX: 210,
    sourceY: 280,
  })!;

  assert.equal(early.severity, 0.4);
  assert.equal(early.directional, true);
  assert.equal(early.nx, 1);
  assert.equal(early.ny, 0);
  assert.ok(late.shellRadius < early.shellRadius);
  assert.ok(late.tetherProgress > early.tetherProgress);
});

test("real Stasis play publishes a per-target onset event only when slow state changes", () => {
  const deck = [
    "vanguard",
    "bulwark",
    "ranger",
    "swarm",
    "lancer",
    "medic",
    "stasis",
    "repulsor",
  ] as const;
  const match = new Match({
    botEnabled: false,
    playerDeck: deck,
  });
  const enemy: Unit = {
    id: 9001,
    cardId: "vanguard",
    team: "enemy",
    x: 250,
    y: 280,
    hp: 125,
    maxHp: 125,
    radius: 10,
    shield: 0,
    damage: 16,
    range: 20,
    speed: 0,
    interval: 1,
    attackCooldown: 0,
    healCooldown: 0,
    shieldTime: 0,
    rallyTime: 0,
    slowTime: 0,
    slowFactor: 1,
  };
  match.state.units.push(enemy);
  match.state.energy.player = 10;

  assert.equal(match.play("player", "stasis", 210, 280).ok, true);
  const onset = match.state.effects.find(
    (effect) => effect.type === "stasis-hit",
  );
  assert.ok(onset);
  assert.equal(onset.x, 250);
  assert.equal(onset.y, 280);
  assert.equal(onset.radius, 10);
  assert.equal(onset.value, 0.6);
  assert.equal(onset.sourceCardId, "stasis");
  assert.equal(onset.sourceX, 210);
  assert.equal(onset.sourceY, 280);

  match.state.effects = [];
  match.state.energy.player = 10;
  assert.equal(match.play("player", "stasis", 210, 280).ok, true);
  assert.equal(
    match.state.effects.some((effect) => effect.type === "stasis-hit"),
    false,
  );
});

test("non-Stasis and malformed onset events are ignored safely", () => {
  assert.equal(
    stasisHitVisual({
      type: "impact",
      life: 0.3,
      maxLife: 0.58,
      radius: 10,
      value: 0.6,
      sourceCardId: "stasis",
      x: 250,
      y: 280,
      sourceX: 210,
      sourceY: 280,
    }),
    null,
  );
  assert.equal(
    stasisHitVisual({
      type: "stasis-hit",
      life: Number.NaN,
      maxLife: 0.58,
      radius: 10,
      value: 0.6,
      sourceCardId: "stasis",
      x: 250,
      y: 280,
      sourceX: 210,
      sourceY: 280,
    }),
    null,
  );
});
