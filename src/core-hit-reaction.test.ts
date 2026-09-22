import assert from "node:assert/strict";
import test from "node:test";
import { Match } from "./engine";
import { coreHitReaction } from "./core-hit-reaction";

test("core hit reaction points toward the real attack source", () => {
  const fromBelow = coreHitReaction({
    type: "core-hit",
    x: 210,
    y: 35,
    sourceX: 210,
    sourceY: 90,
    life: 0.4,
    maxLife: 0.5,
    radius: 24,
  });
  assert.equal(fromBelow.active, true);
  assert.ok(Math.abs(fromBelow.nx) < 1e-12);
  assert.ok(fromBelow.ny > 0.99);
  assert.ok(fromBelow.intensity > 0.6);

  const fromLeft = coreHitReaction({
    type: "core-hit",
    x: 210,
    y: 35,
    sourceX: 140,
    sourceY: 35,
    life: 0.4,
    maxLife: 0.5,
    radius: 18,
  });
  assert.ok(fromLeft.nx < -0.99);
  assert.ok(Math.abs(fromLeft.ny) < 1e-12);
});

test("core hit reaction is neutral without a usable source", () => {
  assert.equal(
    coreHitReaction({
      type: "core-hit",
      x: 210,
      y: 35,
      life: 0.4,
      maxLife: 0.5,
      radius: 18,
    }).active,
    false,
  );
  assert.equal(
    coreHitReaction({
      type: "core-hit",
      x: 210,
      y: 35,
      sourceX: 210,
      sourceY: 35,
      life: 0.4,
      maxLife: 0.5,
      radius: 18,
    }).active,
    false,
  );
});

test("Pulse core damage carries the cast center into the presentation event", () => {
  const match = new Match({ botEnabled: false });
  const core = match.state.cores.enemy;
  match.state.energy.player = 10;

  const castX = core.x;
  const castY = core.y + 35;
  const result = match.play("player", "pulse", castX, castY);
  assert.equal(result.ok, true);

  const hit = match.state.effects.find((effect) => effect.type === "core-hit");
  assert.ok(hit);
  assert.equal(hit?.sourceX, castX);
  assert.equal(hit?.sourceY, castY);

  const reaction = coreHitReaction(hit);
  assert.equal(reaction.active, true);
  assert.ok(reaction.ny > 0.99);
});

test("malformed lifetime and radius stay bounded", () => {
  const reaction = coreHitReaction({
    type: "core-hit",
    x: 0,
    y: 0,
    sourceX: 10,
    sourceY: 0,
    life: Number.POSITIVE_INFINITY,
    maxLife: Number.NaN,
    radius: Number.POSITIVE_INFINITY,
  });
  assert.equal(reaction.active, false);
  assert.ok(reaction.rimRadius >= 23);
});
