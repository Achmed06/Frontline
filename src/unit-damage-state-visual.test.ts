import assert from "node:assert/strict";
import test from "node:test";
import { unitDamageStateVisual } from "./unit-damage-state-visual";

test("healthy units emit no persistent damage clutter", () => {
  const visual = unitDamageStateVisual(80, 100, "vanguard");
  assert.equal(visual.state, "healthy");
  assert.equal(visual.intensity, 0);
  assert.equal(visual.smokeCount, 0);
  assert.equal(visual.sparkCount, 0);
});

test("damaged heavy and siege units begin showing mechanical wear", () => {
  const heavy = unitDamageStateVisual(45, 100, "bulwark");
  const siege = unitDamageStateVisual(45, 100, "lancer");

  assert.equal(heavy.state, "damaged");
  assert.equal(siege.state, "damaged");
  assert.ok(heavy.intensity > 0);
  assert.ok(heavy.smokeCount >= 1);
  assert.ok(siege.smokeCount >= 1);
  assert.ok(heavy.sparkReach >= siege.sparkReach);
});

test("critical units increase smoke, sparks and ground leakage", () => {
  const critical = unitDamageStateVisual(20, 100, "sentinel");
  const damaged = unitDamageStateVisual(45, 100, "sentinel");

  assert.equal(critical.state, "critical");
  assert.ok(critical.intensity > damaged.intensity);
  assert.ok(critical.smokeCount > damaged.smokeCount);
  assert.ok(critical.sparkCount > damaged.sparkCount);
  assert.ok(critical.groundWidth > damaged.groundWidth);
});

test("swarm critical state stays compact", () => {
  const swarm = unitDamageStateVisual(20, 100, "swarm");
  const heavy = unitDamageStateVisual(20, 100, "bulwark");

  assert.equal(swarm.state, "critical");
  assert.ok(swarm.smokeCount < heavy.smokeCount);
  assert.ok(swarm.sparkReach < heavy.sparkReach);
  assert.ok(swarm.groundWidth < heavy.groundWidth);
});

test("malformed HP values fall back safely", () => {
  const visual = unitDamageStateVisual(
    Number.NaN,
    Number.NaN,
    "vanguard",
  );
  assert.equal(visual.state, "healthy");
  assert.equal(visual.hpRatio, 1);
  assert.equal(visual.intensity, 0);
});
