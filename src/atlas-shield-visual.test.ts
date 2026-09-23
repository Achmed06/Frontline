import assert from "node:assert/strict";
import test from "node:test";
import { Match } from "./engine";
import { COMMANDERS } from "./commanders";
import { atlasShieldVisual } from "./atlas-shield-visual";

test("ATLAS shield visual uses canonical shield and duration values", () => {
  const visual = atlasShieldVisual({
    type: "shield",
    life: 0.35,
    maxLife: 0.7,
    radius: 10,
    value: 70,
    sourceCardId: "atlas",
  });

  assert.ok(visual);
  assert.equal(visual.shieldCap, COMMANDERS.atlas.shield);
  assert.equal(visual.duration, COMMANDERS.atlas.duration);
  assert.equal(visual.shieldGain, 70);
  assert.equal(visual.gainRatio, 1);
  assert.equal(visual.refresh, false);
  assert.equal(visual.plateCount, 6);
  assert.equal(visual.sparkCount, 12);
});

test("ATLAS refresh remains visible without pretending shield gain occurred", () => {
  const refresh = atlasShieldVisual({
    type: "shield",
    life: 0.35,
    maxLife: 0.7,
    radius: 10,
    value: 0,
    sourceCardId: "atlas",
  });

  assert.ok(refresh);
  assert.equal(refresh.shieldGain, 0);
  assert.equal(refresh.gainRatio, 0);
  assert.equal(refresh.refresh, true);
  assert.equal(refresh.sparkCount, 6);
});

test("ATLAS shell locks outward and fades through release", () => {
  const early = atlasShieldVisual({
    type: "shield",
    life: 0.66,
    maxLife: 0.7,
    radius: 10,
    value: 35,
    sourceCardId: "atlas",
  })!;
  const late = atlasShieldVisual({
    type: "shield",
    life: 0.07,
    maxLife: 0.7,
    radius: 10,
    value: 35,
    sourceCardId: "atlas",
  })!;

  assert.ok(late.shellRadius > early.shellRadius);
  assert.ok(late.innerRadius > early.innerRadius);
  assert.ok(late.alpha < early.alpha);
});

test("real ATLAS activation publishes exact per-unit shield metadata", () => {
  const match = new Match({
    playerCommander: "atlas",
    botEnabled: false,
  });
  assert.equal(match.play("player", "vanguard", 210, 450).ok, true);
  const unit = match.state.units[0];
  unit.shield = 50;

  const result = match.activateCommander();
  assert.equal(result.ok, true);
  assert.equal(unit.shield, COMMANDERS.atlas.shield);
  assert.equal(unit.shieldTime, COMMANDERS.atlas.duration);

  const effect = match.state.effects.find(
    (entry) => entry.type === "shield" && entry.sourceCardId === "atlas",
  );
  assert.ok(effect);
  assert.equal(effect.value, 20);
  assert.equal(effect.radius, unit.radius);

  const visual = atlasShieldVisual(effect);
  assert.ok(visual);
  assert.equal(visual.shieldGain, 20);
  assert.equal(visual.shieldCap, 70);
});

test("non-ATLAS and malformed shield effects are ignored safely", () => {
  assert.equal(
    atlasShieldVisual({
      type: "shield",
      life: 0.35,
      maxLife: 0.7,
      radius: 10,
      value: 70,
      sourceCardId: "breaker",
    }),
    null,
  );
  assert.equal(
    atlasShieldVisual({
      type: "shield",
      life: Number.NaN,
      maxLife: 0.7,
      radius: 10,
      value: 70,
      sourceCardId: "atlas",
    }),
    null,
  );
});
