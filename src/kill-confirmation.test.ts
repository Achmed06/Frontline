import assert from "node:assert/strict";
import test from "node:test";
import {
  killConfirmation,
  strongestKillConfirmation,
} from "./kill-confirmation";

test("player kills receive a restrained confirmation", () => {
  const result = killConfirmation({
    type: "death",
    team: "enemy",
    value: 125,
    radius: 22,
  });
  assert.equal(result?.cue, "kill");
  assert.equal(result?.heavy, false);
  assert.ok((result?.intensity ?? 0) > 0.5);
});

test("durable enemy deaths receive the heavy confirmation", () => {
  const result = killConfirmation({
    type: "death",
    team: "enemy",
    value: 440,
    radius: 31,
  });
  assert.equal(result?.cue, "heavyKill");
  assert.equal(result?.heavy, true);
  assert.ok((result?.ringScale ?? 0) > 1);
});

test("enemy kills never produce positive player confirmation", () => {
  assert.equal(
    killConfirmation({
      type: "death",
      team: "player",
      value: 440,
      radius: 31,
    }),
    null,
  );
});

test("non-death effects are ignored", () => {
  assert.equal(
    killConfirmation({
      type: "impact",
      team: "enemy",
      value: 440,
      radius: 31,
    }),
    null,
  );
});

test("radius safely identifies a heavy kill when durability metadata is absent", () => {
  assert.equal(
    killConfirmation({
      type: "death",
      team: "enemy",
      radius: 30,
    })?.cue,
    "heavyKill",
  );
});

test("a simultaneous group chooses one strongest confirmation", () => {
  const result = strongestKillConfirmation([
    { type: "death", team: "enemy", value: 38, radius: 18 },
    { type: "death", team: "enemy", value: 440, radius: 31 },
    { type: "death", team: "enemy", value: 115, radius: 20 },
  ]);
  assert.equal(result?.cue, "heavyKill");
});
