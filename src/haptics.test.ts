import test from "node:test";
import assert from "node:assert/strict";
import { hapticSpec } from "./haptics";

test("haptic cue mapping keeps routine actions restrained", () => {
  assert.deepEqual(hapticSpec("select"), {
    kind: "impact",
    style: "light",
  });
  assert.deepEqual(hapticSpec("deployFast"), {
    kind: "impact",
    style: "light",
  });
  assert.deepEqual(hapticSpec("deploy"), {
    kind: "impact",
    style: "medium",
  });
  assert.deepEqual(hapticSpec("deployHeavy"), {
    kind: "impact",
    style: "heavy",
  });
  assert.deepEqual(hapticSpec("reward"), {
    kind: "impact",
    style: "medium",
  });
  assert.deepEqual(hapticSpec("contact"), {
    kind: "impact",
    style: "medium",
  });
  assert.deepEqual(hapticSpec("heavyContact"), {
    kind: "impact",
    style: "heavy",
  });
  assert.deepEqual(hapticSpec("kill"), {
    kind: "impact",
    style: "medium",
  });
  assert.deepEqual(hapticSpec("heavyKill"), {
    kind: "impact",
    style: "heavy",
  });
  assert.deepEqual(hapticSpec("coreImpact"), {
    kind: "impact",
    style: "medium",
  });
  for (const cue of [
    "coreCriticalImpact",
    "coreBreak",
    "coreLost",
  ] as const) {
    assert.deepEqual(hapticSpec(cue), {
      kind: "impact",
      style: "heavy",
    });
  }
  assert.deepEqual(hapticSpec("ability"), {
    kind: "impact",
    style: "heavy",
  });
});

test("haptic cue mapping reserves notifications for high-signal outcomes", () => {
  assert.deepEqual(hapticSpec("capture"), {
    kind: "notification",
    type: "success",
  });
  assert.deepEqual(hapticSpec("success"), {
    kind: "notification",
    type: "success",
  });
  assert.deepEqual(hapticSpec("warning"), {
    kind: "notification",
    type: "warning",
  });
  assert.deepEqual(hapticSpec("error"), {
    kind: "notification",
    type: "error",
  });
});
