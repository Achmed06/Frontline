import assert from "node:assert/strict";
import test from "node:test";
import {
  CORE_TURRET_DAMAGE,
  CORE_TURRET_INTERVAL,
  CORE_TURRET_RANGE,
  Match,
} from "./engine";
import { coreTurretVisual } from "./core-turret-visual";

test("core turret visual tracks the exact shared reload interval", () => {
  assert.deepEqual(coreTurretVisual(CORE_TURRET_INTERVAL), {
    charge: 0,
    phase: "reload",
    bracketScale: 1.18,
    sightAlpha: 0.18,
    chargeAlpha: 0.28,
  });

  const half = coreTurretVisual(CORE_TURRET_INTERVAL / 2);
  assert.equal(half.charge, 0.5);
  assert.equal(half.phase, "track");
  assert.ok(Math.abs(half.bracketScale - 1.04) < 1e-12);

  const lock = coreTurretVisual(CORE_TURRET_INTERVAL * 0.2);
  assert.equal(lock.charge, 0.8);
  assert.equal(lock.phase, "lock");
  assert.ok(lock.sightAlpha > half.sightAlpha);
});

test("core turret visual clamps malformed cooldowns safely", () => {
  assert.equal(coreTurretVisual(-5).charge, 1);
  assert.equal(coreTurretVisual(99).charge, 0);
  assert.equal(coreTurretVisual(Number.NaN).charge, 1);
  assert.equal(coreTurretVisual(0.5, Number.NaN).charge, 0.5);
});

test("match exposes read-only exact turret cooldown without changing cadence", () => {
  const match = new Match({ botEnabled: false });
  const core = match.state.cores.player;
  assert.equal(
    match.play("enemy", "vanguard", core.x, 110).ok,
    true,
  );
  const unit = match.state.units.at(-1)!;
  Object.assign(unit, {
    x: core.x,
    y: core.y - CORE_TURRET_RANGE,
    speed: 0,
    damage: 0,
    range: 0,
  });

  const before = unit.hp;
  match.update(1 / 30);
  assert.equal(before - unit.hp, CORE_TURRET_DAMAGE);
  assert.ok(
    Math.abs(match.coreTurretCooldownSeconds("player") - CORE_TURRET_INTERVAL) <
      1e-9,
  );

  match.update(CORE_TURRET_INTERVAL / 2);
  const cooldown = match.coreTurretCooldownSeconds("player");
  assert.ok(cooldown > 0 && cooldown < CORE_TURRET_INTERVAL);
  const visual = coreTurretVisual(cooldown);
  assert.equal(visual.phase, "track");

  const hpAfterFirst = unit.hp;
  match.update(CORE_TURRET_INTERVAL / 2 + 1 / 30);
  assert.equal(hpAfterFirst - unit.hp, CORE_TURRET_DAMAGE);
});
