import assert from "node:assert/strict";
import test from "node:test";
import { impactProfile } from "./combat-feedback";

test("impact profiles keep weapon families visually distinct", () => {
  assert.deepEqual(impactProfile("ranger"), {
    kind: "precision",
    scale: 0.82,
    rays: 4,
    shards: 6,
  });
  assert.equal(impactProfile("lancer").kind, "rail");
  assert.equal(impactProfile("mortar").kind, "explosive");
  assert.equal(impactProfile("disruptor").kind, "electric");
  assert.equal(impactProfile("sentinel").kind, "heavy");
  assert.equal(impactProfile("core-turret").kind, "beam");
  assert.equal(impactProfile("breaker").kind, "breach");
  assert.equal(impactProfile("vanguard").kind, "melee");
  assert.equal(impactProfile("swarm").kind, "melee");
  assert.equal(impactProfile("pulse").kind, "pulse");
  assert.equal(impactProfile("unknown").kind, "generic");
  assert.equal(impactProfile().kind, "generic");
});

test("heavier visual families scale above precision while remaining cosmetic", () => {
  const precision = impactProfile("ranger");
  const rail = impactProfile("lancer");
  const explosive = impactProfile("mortar");
  const heavy = impactProfile("sentinel");
  assert.ok(rail.scale > precision.scale);
  assert.ok(explosive.scale > rail.scale);
  assert.ok(heavy.shards > precision.shards);
  assert.ok(explosive.shards > heavy.shards);
});
