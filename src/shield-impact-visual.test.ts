import assert from "node:assert/strict";
import test from "node:test";
import { Match } from "./engine";
import { shieldImpactVisual } from "./shield-impact-visual";

test("shield impact visual distinguishes absorption from a real break", () => {
  const absorb = shieldImpactVisual({
    type: "shield-hit",
    x: 100,
    y: 100,
    sourceX: 60,
    sourceY: 100,
    life: 0.25,
    maxLife: 0.34,
    radius: 22,
    value: 26,
  });
  const broken = shieldImpactVisual({
    type: "shield-break",
    x: 100,
    y: 100,
    sourceX: 60,
    sourceY: 100,
    life: 0.45,
    maxLife: 0.58,
    radius: 30,
    value: 70,
  });

  assert.equal(absorb?.mode, "absorb");
  assert.equal(broken?.mode, "break");
  assert.equal(absorb?.directional, true);
  assert.ok((absorb?.nx ?? 0) < -0.99);
  assert.ok((broken?.crackReach ?? 0) > (absorb?.crackReach ?? 0));
  assert.ok((broken?.fragmentReach ?? 0) > (absorb?.fragmentReach ?? 0));
});

test("Atlas shield damage emits absorption and break presentation events", () => {
  const match = new Match({ botEnabled: false });
  assert.equal(match.play("player", "vanguard", 210, 440).ok, true);
  const unit = match.state.units[0];

  assert.equal(match.activateCommander("player").ok, true);
  assert.equal(unit.shield, 70);

  match.state.energy.enemy = 10;
  assert.equal(match.play("enemy", "pulse", unit.x, unit.y).ok, true);

  const hit = match.state.effects.find(
    (effect) => effect.type === "shield-hit",
  );
  const broken = match.state.effects.find(
    (effect) => effect.type === "shield-break",
  );

  assert.ok(hit);
  assert.ok(broken);
  assert.equal(hit?.team, "player");
  assert.equal(broken?.team, "player");
  assert.equal(hit?.value, 70);
  assert.equal(unit.shield, 0);
  assert.equal(unit.hp, unit.maxHp - 15);
});

test("non shield events and malformed values stay safe", () => {
  assert.equal(
    shieldImpactVisual({
      type: "impact",
      x: 0,
      y: 0,
      life: 0.2,
      maxLife: 0.24,
      radius: 12,
      value: 8,
    }),
    null,
  );

  const malformed = shieldImpactVisual({
    type: "shield-hit",
    x: 0,
    y: 0,
    sourceX: Number.NaN,
    sourceY: 0,
    life: Number.NaN,
    maxLife: Number.NaN,
    radius: Number.POSITIVE_INFINITY,
    value: Number.NaN,
  });

  assert.ok(malformed);
  assert.equal(malformed?.alpha, 0);
  assert.equal(malformed?.directional, false);
  assert.ok((malformed?.radius ?? 0) >= 12);
});
