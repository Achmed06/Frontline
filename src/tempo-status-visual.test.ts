import assert from "node:assert/strict";
import test from "node:test";
import {
  TEMPO_ATTACK_SPEED_MULTIPLIER,
  TEMPO_MOVE_SPEED_MULTIPLIER,
} from "./tempo";
import { tempoStatusVisual } from "./tempo-status-visual";

test("tempo visual uses the exact shared Rally and NOVA multipliers", () => {
  const visual = tempoStatusVisual(6);

  assert.equal(visual.active, true);
  assert.ok(
    Math.abs(
      visual.moveBoost -
        (TEMPO_MOVE_SPEED_MULTIPLIER - 1),
    ) < 1e-12,
  );
  assert.ok(
    Math.abs(
      visual.attackBoost -
        (TEMPO_ATTACK_SPEED_MULTIPLIER - 1),
    ) < 1e-12,
  );
  assert.ok(Math.abs(visual.moveBoost - 0.25) < 1e-12);
  assert.ok(Math.abs(visual.attackBoost - 0.3) < 1e-12);
});

test("attack channel is slightly stronger than movement for current values", () => {
  const visual = tempoStatusVisual(4);

  assert.ok(visual.attackStrength > visual.moveStrength);
  assert.ok(visual.ringRadius > 17);
  assert.ok(visual.tickCount >= 6);
  assert.ok(visual.chevronCount >= 3);
});

test("final fraction enters a visible release fade without changing boosts", () => {
  const full = tempoStatusVisual(3);
  const ending = tempoStatusVisual(0.2);

  assert.equal(full.moveBoost, ending.moveBoost);
  assert.equal(full.attackBoost, ending.attackBoost);
  assert.ok(ending.release > full.release);
  assert.ok(ending.alpha < full.alpha);
});

test("expired and malformed tempo is safely inactive", () => {
  assert.equal(tempoStatusVisual(0).active, false);
  assert.equal(tempoStatusVisual(Number.NaN).active, false);
});
