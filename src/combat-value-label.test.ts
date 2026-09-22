import assert from "node:assert/strict";
import test from "node:test";
import { Match } from "./engine";
import { combatValuePresentation } from "./combat-value-label";

test("shield and HP damage use distinct labels and vertical lanes", () => {
  const shield = combatValuePresentation({
    type: "shield-hit",
    team: "player",
    value: 26,
  });
  const hp = combatValuePresentation({
    type: "impact",
    team: "enemy",
    value: 26,
  });

  assert.deepEqual(shield, {
    text: "−26 SCH",
    color: "#a9dfff",
    xOffset: -7,
    yOffset: -8,
  });
  assert.deepEqual(hp, {
    text: "−26 HP",
    color: "#ffd0a0",
    xOffset: 7,
    yOffset: 0,
  });
});

test("shield break itself does not duplicate the shield damage number", () => {
  assert.equal(
    combatValuePresentation({
      type: "shield-break",
      team: "player",
      value: 70,
    }),
    null,
  );
});

test("small chip damage remains suppressed to avoid combat text spam", () => {
  assert.equal(
    combatValuePresentation({
      type: "impact",
      team: "enemy",
      value: 16,
    }),
    null,
  );
  assert.equal(
    combatValuePresentation({
      type: "shield-hit",
      team: "player",
      value: 7,
    }),
    null,
  );
});

test("real shield overflow exposes shield and HP portions separately", () => {
  const match = new Match({ botEnabled: false });
  assert.equal(match.play("player", "vanguard", 210, 440).ok, true);
  const unit = match.state.units[0];

  assert.equal(match.activateCommander("player").ok, true);
  match.state.energy.enemy = 10;
  assert.equal(match.play("enemy", "pulse", unit.x, unit.y).ok, true);

  const shield = match.state.effects.find(
    (effect) => effect.type === "shield-hit",
  );
  const impact = match.state.effects.find(
    (effect) => effect.type === "impact",
  );

  assert.equal(shield?.value, 70);
  assert.equal(impact?.value, 15);
  assert.equal(
    combatValuePresentation(shield!)?.text,
    "−70 SCH",
  );
  assert.equal(
    combatValuePresentation(impact!),
    null,
    "15 HP overflow stays below the anti-spam threshold",
  );
});

test("existing high-signal heal, shield gain and core values keep labels", () => {
  assert.equal(
    combatValuePresentation({
      type: "heal",
      team: "player",
      value: 65,
    })?.text,
    "+65 HP",
  );
  assert.equal(
    combatValuePresentation({
      type: "shield",
      team: "player",
      value: 70,
    })?.text,
    "+70 SCH",
  );
  assert.equal(
    combatValuePresentation({
      type: "core-hit",
      team: "player",
      value: 45,
    })?.text,
    "−45 CORE",
  );
});
