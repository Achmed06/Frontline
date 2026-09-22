import test from "node:test";
import assert from "node:assert/strict";
import { ENERGY_RATE } from "./engine";
import { energyReadiness, energySpent } from "./energy-feedback";

test("energy readiness exposes exact affordable threshold and progress", () => {
  assert.deepEqual(energyReadiness(0, 4), {
    affordable: false,
    progress: 0,
    missing: 4,
    waitSeconds: 4 / ENERGY_RATE,
  });

  const partial = energyReadiness(2.5, 4);
  assert.equal(partial.affordable, false);
  assert.equal(partial.progress, 0.625);
  assert.equal(partial.missing, 1.5);
  assert.ok(
    Math.abs(partial.waitSeconds - 1.5 / ENERGY_RATE) < 1e-12,
  );

  assert.deepEqual(energyReadiness(4, 4), {
    affordable: true,
    progress: 1,
    missing: 0,
    waitSeconds: 0,
  });
  assert.deepEqual(energyReadiness(8, 4), {
    affordable: true,
    progress: 1,
    missing: 0,
    waitSeconds: 0,
  });
});

test("energy readiness supports free cards and custom recharge rates", () => {
  assert.deepEqual(energyReadiness(0, 0), {
    affordable: true,
    progress: 1,
    missing: 0,
    waitSeconds: 0,
  });
  const custom = energyReadiness(1, 3, 0.5);
  assert.equal(custom.progress, 1 / 3);
  assert.equal(custom.missing, 2);
  assert.equal(custom.waitSeconds, 4);
});

test("energy readiness sanitizes malformed values without impossible UI state", () => {
  assert.deepEqual(energyReadiness(Number.NaN, 3), {
    affordable: false,
    progress: 0,
    missing: 3,
    waitSeconds: 3 / ENERGY_RATE,
  });
  assert.deepEqual(energyReadiness(-4, -2), {
    affordable: true,
    progress: 1,
    missing: 0,
    waitSeconds: 0,
  });
  const stalled = energyReadiness(1, 3, Number.NaN);
  assert.equal(stalled.affordable, false);
  assert.equal(stalled.progress, 1 / 3);
  assert.equal(stalled.missing, 2);
  assert.equal(stalled.waitSeconds, 0);
});

test("energy spend reports only the actual post-play decrease", () => {
  assert.equal(energySpent(6, 3), 3);
  assert.ok(Math.abs(energySpent(6.2, 2.2) - 4) < 1e-12);
  assert.equal(energySpent(3, 3.5), 0);
  assert.equal(energySpent(Number.NaN, 2), 0);
  assert.equal(energySpent(4, Number.NaN), 4);
});
