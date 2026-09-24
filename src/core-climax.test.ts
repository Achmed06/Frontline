import assert from "node:assert/strict";
import test from "node:test";
import {
  coreImpactClimax,
  strongestCoreImpactClimax,
} from "./core-climax";

test("stable Core hits keep normal presentation and emit no extra cue", () => {
  const result = coreImpactClimax(
    { type: "core-hit", team: "player", radius: 20, value: 40 },
    0.8,
  );
  assert.equal(result?.state, "stable");
  assert.equal(result?.cue, null);
  assert.equal(result?.visualScale, 1);
});

test("damaged enemy Core hits gain a restrained player confirmation", () => {
  const result = coreImpactClimax(
    { type: "core-hit", team: "player", radius: 20, value: 40 },
    0.5,
  );
  assert.equal(result?.state, "damaged");
  assert.equal(result?.cue, "coreImpact");
  assert.ok((result?.visualScale ?? 0) > 1);
});

test("critical enemy Core hits receive the stronger climax cue", () => {
  const result = coreImpactClimax(
    { type: "core-hit", team: "player", radius: 28, value: 80 },
    0.2,
  );
  assert.equal(result?.state, "critical");
  assert.equal(result?.cue, "coreCriticalImpact");
  assert.ok((result?.cameraScale ?? 0) > 1.15);
  assert.ok((result?.ringAlpha ?? 0) > 0.5);
});

test("incoming hits on the player Core never emit positive attack confirmation", () => {
  const result = coreImpactClimax(
    { type: "core-hit", team: "enemy", radius: 28, value: 80 },
    0.2,
  );
  assert.equal(result?.state, "critical");
  assert.equal(result?.cue, null);
});

test("destroyed Core uses the maximum critical impact presentation", () => {
  const result = coreImpactClimax(
    { type: "core-hit", team: "player", radius: 32, value: 120 },
    0,
  );
  assert.equal(result?.state, "destroyed");
  assert.equal(result?.cue, "coreCriticalImpact");
  assert.ok((result?.visualScale ?? 0) >= 1.3);
});

test("simultaneous Core hits choose only one strongest cue", () => {
  const result = strongestCoreImpactClimax(
    [
      { type: "core-hit", team: "player", radius: 16, value: 20 },
      { type: "core-hit", team: "player", radius: 31, value: 110 },
      { type: "core-hit", team: "enemy", radius: 34, value: 120 },
    ],
    0.18,
  );
  assert.equal(result?.cue, "coreCriticalImpact");
  assert.ok((result?.intensity ?? 0) > 0.85);
});

test("non Core-hit effects are ignored", () => {
  assert.equal(
    coreImpactClimax(
      { type: "impact", team: "player", radius: 30, value: 80 },
      0.2,
    ),
    null,
  );
});
