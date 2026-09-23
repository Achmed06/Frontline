import assert from "node:assert/strict";
import test from "node:test";
import { Match } from "./engine";
import { COMMANDERS } from "./commanders";
import { lyraRepairVisual } from "./lyra-repair-visual";

test("LYRA repair uses canonical 80 HP healing cap", () => {
  const visual = lyraRepairVisual({
    type: "heal",
    life: 0.45,
    maxLife: 0.9,
    radius: 10,
    value: 80,
    sourceCardId: "lyra",
    cleanse: false,
  });

  assert.ok(visual);
  assert.equal(visual.healingCap, COMMANDERS.lyra.healing);
  assert.equal(visual.healing, 80);
  assert.equal(visual.healRatio, 1);
  assert.equal(visual.cleanse, false);
});

test("cleanse-only LYRA pulse stays visible without inventing healing", () => {
  const visual = lyraRepairVisual({
    type: "heal",
    life: 0.45,
    maxLife: 0.9,
    radius: 10,
    value: 0,
    sourceCardId: "lyra",
    cleanse: true,
  });

  assert.ok(visual);
  assert.equal(visual.healing, 0);
  assert.equal(visual.healRatio, 0);
  assert.equal(visual.cleanse, true);
  assert.ok(visual.cleanseArcCount > 0);
  assert.ok(visual.strength >= 0.75);
});

test("LYRA repair shell expands and fades through release", () => {
  const early = lyraRepairVisual({
    type: "heal",
    life: 0.84,
    maxLife: 0.9,
    radius: 10,
    value: 40,
    sourceCardId: "lyra",
    cleanse: true,
  })!;
  const late = lyraRepairVisual({
    type: "heal",
    life: 0.08,
    maxLife: 0.9,
    radius: 10,
    value: 40,
    sourceCardId: "lyra",
    cleanse: true,
  })!;

  assert.ok(late.shellRadius > early.shellRadius);
  assert.ok(late.innerRadius > early.innerRadius);
  assert.ok(late.alpha < early.alpha);
});

test("real LYRA activation publishes exact healing and cleanse metadata", () => {
  const match = new Match({
    playerCommander: "lyra",
    botEnabled: false,
  });
  assert.equal(match.play("player", "vanguard", 210, 450).ok, true);
  const unit = match.state.units[0];

  unit.hp = unit.maxHp - 35;
  unit.slowTime = 3;
  unit.slowFactor = 0.6;

  const result = match.activateCommander();
  assert.equal(result.ok, true);
  assert.equal(unit.hp, unit.maxHp);
  assert.equal(unit.slowTime, 0);
  assert.equal(unit.slowFactor, 1);

  const effect = match.state.effects.find(
    (entry) => entry.type === "heal" && entry.sourceCardId === "lyra",
  );
  assert.ok(effect);
  assert.equal(effect.radius, unit.radius);
  assert.equal(effect.value, 35);
  assert.equal(effect.cleanse, true);

  const visual = lyraRepairVisual(effect);
  assert.ok(visual);
  assert.equal(visual.healing, 35);
  assert.equal(visual.cleanse, true);
});

test("non-LYRA and malformed repair effects are ignored safely", () => {
  assert.equal(
    lyraRepairVisual({
      type: "heal",
      life: 0.45,
      maxLife: 0.9,
      radius: 10,
      value: 35,
      sourceCardId: "medic",
      cleanse: false,
    }),
    null,
  );
  assert.equal(
    lyraRepairVisual({
      type: "heal",
      life: Number.NaN,
      maxLife: 0.9,
      radius: 10,
      value: 35,
      sourceCardId: "lyra",
      cleanse: true,
    }),
    null,
  );
});
