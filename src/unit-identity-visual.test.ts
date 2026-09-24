import assert from "node:assert/strict";
import test from "node:test";
import { unitIdentityVisual } from "./unit-identity-visual";

test("Bulwark reads heavier than Vanguard", () => {
  const bulwark = unitIdentityVisual("bulwark");
  const vanguard = unitIdentityVisual("vanguard");
  assert.equal(bulwark.kind, "heavy");
  assert.ok(bulwark.displaySize > vanguard.displaySize);
  assert.ok(bulwark.bobAmplitude < vanguard.bobAmplitude);
  assert.ok(bulwark.ringWidth > vanguard.ringWidth);
});

test("Raider reads faster and less stable than Vanguard", () => {
  const raider = unitIdentityVisual("raider");
  const vanguard = unitIdentityVisual("vanguard");
  assert.equal(raider.kind, "skirmisher");
  assert.ok(raider.bobAmplitude > vanguard.bobAmplitude);
  assert.ok(raider.swayAmplitude > vanguard.swayAmplitude);
  assert.ok(raider.leanScale > vanguard.leanScale);
});

test("Swarm keeps the smallest, most animated silhouette", () => {
  const swarm = unitIdentityVisual("swarm");
  const mortar = unitIdentityVisual("mortar");
  assert.equal(swarm.kind, "swarm");
  assert.ok(swarm.displaySize < mortar.displaySize);
  assert.ok(swarm.bobScale > mortar.bobScale);
});

test("Mortar is visually planted", () => {
  const mortar = unitIdentityVisual("mortar");
  assert.equal(mortar.kind, "siege");
  assert.ok(mortar.bobAmplitude < 0.5);
  assert.ok(mortar.shadowWidth > 0.8);
});

test("unknown units fall back to a safe standard identity", () => {
  const unknown = unitIdentityVisual("future-unit");
  assert.equal(unknown.kind, "standard");
  assert.equal(unknown.displaySize, 36);
  assert.ok(Number.isFinite(unknown.ringAlpha));
});
