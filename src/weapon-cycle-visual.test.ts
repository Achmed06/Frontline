import assert from "node:assert/strict";
import test from "node:test";
import { weaponCycleVisual } from "./weapon-cycle-visual";

test("slow high-impact weapons expose their exact reload progress", () => {
  const lancer = weaponCycleVisual("lancer", 1.1, 2.2);
  const mortar = weaponCycleVisual("mortar", 0.45, 1.8);

  assert.equal(lancer.active, true);
  assert.equal(lancer.kind, "rail");
  assert.equal(lancer.charge, 0.5);
  assert.equal(lancer.remaining, 0.5);
  assert.equal(mortar.kind, "explosive");
  assert.equal(mortar.charge, 0.75);
  assert.ok(mortar.prominence >= 1);
});

test("heavy and electric weapons are readable but less prominent", () => {
  const sentinel = weaponCycleVisual("sentinel", 0.55, 1.1);
  const disruptor = weaponCycleVisual("disruptor", 0.65, 1.3);

  assert.equal(sentinel.active, true);
  assert.equal(sentinel.kind, "heavy");
  assert.equal(disruptor.kind, "electric");
  assert.ok(sentinel.prominence < 1);
  assert.ok(disruptor.prominence < sentinel.prominence);
});

test("fast precision and melee units do not add reload clutter", () => {
  assert.equal(
    weaponCycleVisual("ranger", 0.5, 0.95).active,
    false,
  );
  assert.equal(
    weaponCycleVisual("vanguard", 0.5, 1).active,
    false,
  );
  assert.equal(
    weaponCycleVisual("breaker", 0.5, 1.1).active,
    false,
  );
});

test("ready and malformed cooldown states remain bounded", () => {
  const ready = weaponCycleVisual("lancer", 0, 2.2);
  assert.equal(ready.active, false);
  assert.equal(ready.charge, 1);
  assert.equal(ready.remaining, 0);

  const malformed = weaponCycleVisual(
    "mortar",
    Number.NaN,
    Number.NaN,
  );
  assert.equal(malformed.active, false);
  assert.equal(malformed.charge, 1);
  assert.equal(malformed.remaining, 0);
});
