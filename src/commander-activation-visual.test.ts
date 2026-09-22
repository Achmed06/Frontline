import assert from "node:assert/strict";
import test from "node:test";
import { Match } from "./engine";
import { commanderActivationVisual } from "./commander-activation-visual";

const effect = (
  commander: "atlas" | "nova" | "lyra",
  team: "player" | "enemy" = "player",
) => ({
  type: "commander" as const,
  team,
  life: 0.45,
  maxLife: 0.9,
  radius: 72,
  sourceCardId: commander,
});

test("commander activation visual gives every commander a distinct signature", () => {
  assert.deepEqual(commanderActivationVisual(effect("atlas")), {
    commander: "atlas",
    kind: "shield",
    progress: 0.5,
    alpha: 0.5,
    radius: 72,
    direction: -1,
    spokes: 6,
  });
  assert.equal(commanderActivationVisual(effect("nova"))?.kind, "tempo");
  assert.equal(commanderActivationVisual(effect("nova"))?.spokes, 8);
  assert.equal(commanderActivationVisual(effect("lyra"))?.kind, "repair");
  assert.equal(
    commanderActivationVisual(effect("lyra", "enemy"))?.direction,
    1,
  );
});

test("commander visual ignores unrelated effects and clamps malformed geometry", () => {
  assert.equal(
    commanderActivationVisual({
      ...effect("atlas"),
      type: "shield",
    }),
    null,
  );
  assert.equal(
    commanderActivationVisual({
      ...effect("atlas"),
      sourceCardId: "fake",
    }),
    null,
  );
  const malformed = commanderActivationVisual({
    ...effect("atlas"),
    life: Number.NaN,
    maxLife: Number.NaN,
    radius: 999,
  })!;
  assert.equal(malformed.progress, 0);
  assert.equal(malformed.alpha, 1);
  assert.equal(malformed.radius, 140);
});

test("successful commander activation emits one formation-level visual cue", () => {
  const match = new Match({
    playerCommander: "atlas",
    botEnabled: false,
  });
  assert.equal(match.play("player", "vanguard", 180, 450).ok, true);
  assert.equal(match.play("player", "ranger", 240, 430).ok, true);

  const result = match.activateCommander();
  assert.equal(result.ok, true);

  const cues = match.state.effects.filter(
    (entry) => entry.type === "commander",
  );
  assert.equal(cues.length, 1);
  const cue = cues[0];
  assert.equal(cue.team, "player");
  assert.equal(cue.sourceCardId, "atlas");
  assert.equal(cue.maxLife, 0.9);
  assert.equal(cue.life, 0.9);
  assert.equal(cue.x, 210);
  assert.equal(cue.y, 440);
  assert.ok((cue.radius ?? 0) >= 44);
  assert.equal(
    match.state.effects.filter((entry) => entry.type === "shield").length,
    2,
  );
});

test("failed commander activation emits no formation cue", () => {
  const match = new Match({
    playerCommander: "atlas",
    botEnabled: false,
  });
  assert.equal(match.activateCommander().ok, false);
  assert.equal(
    match.state.effects.some((entry) => entry.type === "commander"),
    false,
  );
});
