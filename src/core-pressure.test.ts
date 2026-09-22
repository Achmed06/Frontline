import test from "node:test";
import assert from "node:assert/strict";
import {
  CORE_CRITICAL_FRACTION,
  CORE_DAMAGED_FRACTION,
  corePressure,
  corePressureLabel,
} from "./core-pressure";

test("core pressure uses shared damaged and critical thresholds", () => {
  assert.equal(CORE_DAMAGED_FRACTION, 0.6);
  assert.equal(CORE_CRITICAL_FRACTION, 0.3);

  assert.deepEqual(corePressure(2300, 2300), {
    fraction: 1,
    percent: 100,
    state: "stable",
  });
  assert.equal(corePressure(1381, 2300).state, "stable");
  assert.equal(corePressure(1380, 2300).state, "damaged");
  assert.equal(corePressure(691, 2300).state, "damaged");
  assert.equal(corePressure(690, 2300).state, "critical");
  assert.equal(corePressure(1, 2300).state, "critical");
  assert.equal(corePressure(0, 2300).state, "destroyed");
});

test("core pressure clamps malformed values and percentages safely", () => {
  assert.deepEqual(corePressure(9999, 2300), {
    fraction: 1,
    percent: 100,
    state: "stable",
  });
  assert.equal(corePressure(-5, 2300).percent, 0);
  assert.equal(corePressure(Number.NaN, 2300).state, "destroyed");
  assert.equal(corePressure(50, 0).state, "stable");
  assert.equal(corePressure(0, 0).state, "destroyed");
});

test("core pressure labels stay perspective-aware", () => {
  assert.equal(corePressureLabel("stable", "player"), "");
  assert.equal(corePressureLabel("damaged", "player"), "BESCHÄDIGT");
  assert.equal(corePressureLabel("critical", "player"), "CORE KRITISCH");
  assert.equal(corePressureLabel("destroyed", "player"), "AUSGEFALLEN");

  assert.equal(corePressureLabel("damaged", "enemy"), "ANGREIFBAR");
  assert.equal(
    corePressureLabel("critical", "enemy"),
    "DURCHBRUCHFENSTER",
  );
  assert.equal(corePressureLabel("destroyed", "enemy"), "ZERSTÖRT");
});
