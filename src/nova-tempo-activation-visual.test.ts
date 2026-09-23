import assert from "node:assert/strict";
import test from "node:test";
import { Match } from "./engine";
import { COMMANDERS } from "./commanders";
import { novaTempoActivationVisual } from "./nova-tempo-activation-visual";

test("NOVA activation uses canonical duration and tempo multipliers", () => {
  const visual = novaTempoActivationVisual({
    type: "rally",
    life: 0.35,
    maxLife: 0.7,
    radius: 10,
    value: 6,
    sourceCardId: "nova",
  });

  assert.ok(visual);
  assert.equal(visual.duration, COMMANDERS.nova.duration);
  assert.equal(visual.moveMultiplier, COMMANDERS.nova.moveSpeedMultiplier);
  assert.equal(
    visual.attackMultiplier,
    COMMANDERS.nova.attackSpeedMultiplier,
  );
  assert.equal(visual.moveBoost, 0.25);
  assert.equal(visual.attackBoost, 0.3);
  assert.equal(visual.strength, 1);
});

test("NOVA activation expands around the unit and fades through release", () => {
  const early = novaTempoActivationVisual({
    type: "rally",
    life: 0.66,
    maxLife: 0.7,
    radius: 10,
    value: 6,
    sourceCardId: "nova",
  })!;
  const late = novaTempoActivationVisual({
    type: "rally",
    life: 0.07,
    maxLife: 0.7,
    radius: 10,
    value: 6,
    sourceCardId: "nova",
  })!;

  assert.ok(late.shellRadius > early.shellRadius);
  assert.ok(late.surgeRadius > early.surgeRadius);
  assert.ok(late.alpha < early.alpha);
});

test("real NOVA activation publishes per-unit tempo metadata", () => {
  const match = new Match({
    playerCommander: "nova",
    botEnabled: false,
  });
  assert.equal(match.play("player", "vanguard", 210, 450).ok, true);

  const unit = match.state.units[0];
  const result = match.activateCommander();
  assert.equal(result.ok, true);
  assert.equal(unit.rallyTime, COMMANDERS.nova.duration);

  const effect = match.state.effects.find(
    (entry) => entry.type === "rally" && entry.sourceCardId === "nova",
  );
  assert.ok(effect);
  assert.equal(effect.radius, unit.radius);
  assert.equal(effect.value, COMMANDERS.nova.duration);

  const visual = novaTempoActivationVisual(effect);
  assert.ok(visual);
  assert.equal(visual.duration, 6);
  assert.equal(visual.moveMultiplier, 1.25);
  assert.equal(visual.attackMultiplier, 1.3);
});

test("Rally-card and malformed effects are ignored safely", () => {
  assert.equal(
    novaTempoActivationVisual({
      type: "rally",
      life: 0.35,
      maxLife: 0.7,
      radius: 10,
      value: 6,
      sourceCardId: "rally",
    }),
    null,
  );
  assert.equal(
    novaTempoActivationVisual({
      type: "rally",
      life: Number.NaN,
      maxLife: 0.7,
      radius: 10,
      value: 6,
      sourceCardId: "nova",
    }),
    null,
  );
});
