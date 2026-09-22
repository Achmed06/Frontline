import assert from "node:assert/strict";
import test from "node:test";
import type { ControlPoint, ControlPointPressure } from "./engine";
import { controlPointVisual } from "./control-point-visual";

const point = (
  overrides: Partial<ControlPoint> = {},
): ControlPoint => ({
  id: 4,
  x: 210,
  y: 280,
  owner: null,
  capture: 0,
  captureTeam: null,
  contested: false,
  supplied: false,
  ...overrides,
});

const pressure = (
  overrides: Partial<ControlPointPressure> = {},
): ControlPointPressure => ({
  playerCount: 0,
  enemyCount: 0,
  contested: false,
  capturer: null,
  mode: "idle",
  captureMultiplier: 1,
  groupMultiplier: 1,
  rate: 0,
  secondsRemaining: 0,
  ...overrides,
});

test("non-objective points do not receive relay emphasis", () => {
  assert.equal(controlPointVisual(point(), pressure(), false), null);
});

test("active relay capture follows the capturer and becomes critical near completion", () => {
  const visual = controlPointVisual(
    point({ capture: 0.82, captureTeam: "player" }),
    pressure({
      capturer: "player",
      mode: "capture",
      rate: 0.2,
      secondsRemaining: 0.9,
      playerCount: 2,
    }),
    true,
  )!;
  assert.equal(visual.stage, "capture");
  assert.equal(visual.team, "player");
  assert.equal(visual.progress, 0.82);
  assert.equal(visual.remaining, 0.9);
  assert.equal(visual.critical, true);
  assert.ok(visual.intensity > 0.85);
});

test("contested relay stays neutral while reverse follows the pushing team", () => {
  const contested = controlPointVisual(
    point({ owner: "player", capture: 0.5, captureTeam: "enemy" }),
    pressure({
      mode: "contested",
      contested: true,
      playerCount: 1,
      enemyCount: 2,
    }),
    true,
  )!;
  assert.equal(contested.stage, "contested");
  assert.equal(contested.team, null);
  assert.equal(contested.critical, false);

  const reverse = controlPointVisual(
    point({ owner: "enemy", capture: 0.6, captureTeam: "enemy" }),
    pressure({
      mode: "reverse",
      capturer: "player",
      playerCount: 1,
      rate: -0.2,
      secondsRemaining: 3,
    }),
    true,
  )!;
  assert.equal(reverse.stage, "reverse");
  assert.equal(reverse.team, "player");
  assert.equal(reverse.progress, 0.6);
});

test("decay and malformed capture values are clamped safely", () => {
  const decaying = controlPointVisual(
    point({
      capture: Number.NaN,
      captureTeam: "enemy",
      owner: "player",
      supplied: true,
    }),
    pressure({
      mode: "decay",
      rate: -0.1,
      secondsRemaining: Number.NaN,
    }),
    true,
  )!;
  assert.equal(decaying.stage, "decay");
  assert.equal(decaying.team, "enemy");
  assert.equal(decaying.progress, 0);
  assert.equal(decaying.remaining, 0);
  assert.equal(decaying.critical, false);
});

test("supplied owned relays settle into a restrained held state", () => {
  const held = controlPointVisual(
    point({ owner: "player", supplied: true }),
    pressure({ capturer: "player" }),
    true,
  )!;
  assert.deepEqual(held, {
    stage: "held",
    team: "player",
    progress: 0,
    remaining: 0,
    intensity: 0.34,
    critical: false,
  });
});
