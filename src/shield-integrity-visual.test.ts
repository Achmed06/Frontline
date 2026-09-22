import assert from "node:assert/strict";
import test from "node:test";
import { COMMANDERS } from "./commanders";
import { shieldIntegrityVisual } from "./shield-integrity-visual";

test("full Atlas shield exposes complete integrity", () => {
  const visual = shieldIntegrityVisual(
    COMMANDERS.atlas.shield,
    COMMANDERS.atlas.duration,
  );

  assert.equal(visual.active, true);
  assert.equal(visual.integrity, 1);
  assert.equal(visual.timeRatio, 1);
  assert.equal(visual.intactPlates, visual.plateCount);
  assert.equal(visual.crackCount, 0);
});

test("damaged shield loses plates and gains cracks", () => {
  const full = shieldIntegrityVisual(70, 5);
  const damaged = shieldIntegrityVisual(28, 5);

  assert.ok(damaged.integrity < full.integrity);
  assert.ok(damaged.intactPlates < full.intactPlates);
  assert.ok(damaged.crackCount > full.crackCount);
  assert.ok(damaged.gapScale > full.gapScale);
  assert.ok(damaged.shellRadius < full.shellRadius);
});

test("shield expiry enters a visible release phase", () => {
  const stable = shieldIntegrityVisual(70, 3);
  const ending = shieldIntegrityVisual(70, 0.2);

  assert.equal(stable.integrity, ending.integrity);
  assert.ok(ending.release > stable.release);
  assert.ok(ending.releaseRadius > stable.releaseRadius);
  assert.ok(ending.alpha < stable.alpha);
});

test("expired or malformed values are safely inactive", () => {
  assert.equal(shieldIntegrityVisual(0, 4).active, false);
  assert.equal(shieldIntegrityVisual(70, 0).active, false);
  assert.equal(
    shieldIntegrityVisual(Number.NaN, Number.NaN).active,
    false,
  );
});
