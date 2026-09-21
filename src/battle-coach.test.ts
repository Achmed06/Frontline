import test from "node:test";
import assert from "node:assert/strict";
import { Match } from "./engine";
import { normalizeLearning } from "./headquarters";
import { battleCoachHint } from "./battle-coach";

test("battle coach guides the existing learning path without changing combat", () => {
  const progress = normalizeLearning(null);
  const match = new Match({ botEnabled: false });

  let hint = battleCoachHint(progress, match.state, null);
  assert.equal(hint?.title, "TRUPPE WÄHLEN");
  assert.equal(hint?.focus, "cards");

  match.state.energy.player = 1;
  hint = battleCoachHint(progress, match.state, "vanguard");
  assert.equal(hint?.title, "ENERGIE SAMMELN");
  assert.equal(hint?.focus, "cards");
  assert.match(hint?.detail ?? "", /1,4s/);

  match.state.energy.player = 2;
  hint = battleCoachHint(progress, match.state, "vanguard");
  assert.equal(hint?.title, "TRUPPE EINSETZEN");
  assert.equal(hint?.focus, "arena");

  match.state.stats.deployed = 3;
  hint = battleCoachHint(progress, match.state, null);
  assert.equal(hint?.title, "BODEN EROBERN");
  assert.equal(hint?.focus, "arena");

  match.state.stats.captured = 1;
  hint = battleCoachHint(progress, match.state, null);
  assert.equal(hint?.title, "TAKTIK EINSETZEN");
  assert.equal(hint?.focus, "cards");

  match.state.units.push({
    id: 999,
    cardId: "vanguard",
    team: "player",
    x: 210,
    y: 450,
    hp: 120,
    maxHp: 120,
    radius: 10,
    shield: 0,
    damage: 18,
    range: 20,
    speed: 38,
    interval: 0.9,
    attackCooldown: 0,
    healCooldown: 0,
    shieldTime: 0,
    rallyTime: 0,
    slowTime: 0,
    slowFactor: 1,
  });
  hint = battleCoachHint(progress, match.state, null, "atlas");
  assert.equal(hint?.title, "KOMMANDANTENFÄHIGKEIT NUTZEN");
  assert.equal(hint?.focus, "commander");

  match.state.commanderCooldown = 5;
  hint = battleCoachHint(progress, match.state, null);
  assert.equal(hint?.title, "TAKTIK EINSETZEN");
  assert.equal(hint?.focus, "cards");

  match.state.stats.abilities = 1;
  hint = battleCoachHint(progress, match.state, null);
  assert.equal(hint?.title, "FRONT WEITER SCHIEBEN");

  for (const point of match.state.points.slice(0, 6)) point.owner = "player";
  hint = battleCoachHint(progress, match.state, null);
  assert.equal(hint?.title, "CORE DURCHBRECHEN");
});

test("battle coach disappears once the permanent learning path is complete", () => {
  const progress = normalizeLearning({
    counts: { deploy: 3, capture: 1, ability: 1, win: 1 },
    style: "field",
    lastMatch: "done",
  });
  const match = new Match({ botEnabled: false });
  assert.equal(battleCoachHint(progress, match.state, null), null);
});

test("battle coach never highlights an unusable commander", () => {
  const progress = normalizeLearning(null);
  const match = new Match({ botEnabled: false });
  match.state.stats.deployed = 3;
  match.state.stats.captured = 1;

  const unit = {
    id: 1001,
    cardId: "vanguard",
    team: "player" as const,
    x: 210,
    y: 450,
    hp: 120,
    maxHp: 120,
    radius: 10,
    shield: 0,
    damage: 18,
    range: 20,
    speed: 38,
    interval: 0.9,
    attackCooldown: 0,
    healCooldown: 0,
    shieldTime: 0,
    rallyTime: 0,
    slowTime: 0,
    slowFactor: 1,
  };
  match.state.units.push(unit);

  let hint = battleCoachHint(progress, match.state, null, "lyra");
  assert.equal(hint?.title, "TAKTIK EINSETZEN");
  assert.equal(hint?.focus, "cards");

  unit.hp = 60;
  hint = battleCoachHint(progress, match.state, null, "lyra");
  assert.equal(hint?.title, "KOMMANDANTENFÄHIGKEIT NUTZEN");
  assert.equal(hint?.focus, "commander");

  unit.hp = unit.maxHp;
  unit.rallyTime = 6;
  hint = battleCoachHint(progress, match.state, null, "nova");
  assert.equal(hint?.title, "TAKTIK EINSETZEN");

  unit.rallyTime = 2;
  hint = battleCoachHint(progress, match.state, null, "nova");
  assert.equal(hint?.title, "KOMMANDANTENFÄHIGKEIT NUTZEN");
});


test("battle coach uses the live card cost and energy rate before directing deployment", () => {
  const progress = normalizeLearning(null);
  const match = new Match({ botEnabled: false });

  match.state.energy.player = 3.2;
  let hint = battleCoachHint(progress, match.state, "bulwark");
  assert.equal(hint?.title, "ENERGIE SAMMELN");
  assert.equal(hint?.focus, "cards");
  assert.match(hint?.detail ?? "", /1,2s/);

  match.state.energy.player = 4;
  hint = battleCoachHint(progress, match.state, "bulwark");
  assert.equal(hint?.title, "TRUPPE EINSETZEN");
  assert.equal(hint?.focus, "arena");

  match.state.energy.player = 0;
  hint = battleCoachHint(progress, match.state, "pulse");
  assert.equal(hint?.title, "TRUPPE WÄHLEN");
  assert.equal(hint?.focus, "cards");
});


test("battle coach follows a selected tactic into the arena only when it can be used", () => {
  const progress = normalizeLearning(null);
  const match = new Match({ botEnabled: false });
  match.state.stats.deployed = 3;
  match.state.stats.captured = 1;
  match.state.commanderCooldown = 10;

  match.state.energy.player = 3;
  let hint = battleCoachHint(progress, match.state, "pulse");
  assert.equal(hint?.title, "ENERGIE SAMMELN");
  assert.equal(hint?.focus, "cards");
  assert.match(hint?.detail ?? "", /1,4s/);

  match.state.energy.player = 4;
  hint = battleCoachHint(progress, match.state, "pulse");
  assert.equal(hint?.title, "TAKTIK ZIELEN");
  assert.equal(hint?.focus, "arena");

  hint = battleCoachHint(progress, match.state, "rally");
  assert.equal(hint?.title, "ANDERE TAKTIK WÄHLEN");
  assert.equal(hint?.focus, "cards");

  match.state.units.push({
    id: 2001,
    cardId: "vanguard",
    team: "player",
    x: 210,
    y: 450,
    hp: 125,
    maxHp: 125,
    radius: 10,
    shield: 0,
    damage: 16,
    range: 20,
    speed: 35,
    interval: 1,
    attackCooldown: 0,
    healCooldown: 0,
    shieldTime: 0,
    rallyTime: 0,
    slowTime: 0,
    slowFactor: 1,
  });
  hint = battleCoachHint(progress, match.state, "rally");
  assert.equal(hint?.title, "TAKTIK ZIELEN");
  assert.equal(hint?.focus, "arena");
});

test("a deliberately selected usable tactic takes priority over commander coaching", () => {
  const progress = normalizeLearning(null);
  const match = new Match({ botEnabled: false });
  match.state.stats.deployed = 3;
  match.state.stats.captured = 1;
  match.state.units.push({
    id: 2002,
    cardId: "vanguard",
    team: "player",
    x: 210,
    y: 450,
    hp: 125,
    maxHp: 125,
    radius: 10,
    shield: 0,
    damage: 16,
    range: 20,
    speed: 35,
    interval: 1,
    attackCooldown: 0,
    healCooldown: 0,
    shieldTime: 0,
    rallyTime: 0,
    slowTime: 0,
    slowFactor: 1,
  });

  const hint = battleCoachHint(progress, match.state, "pulse", "atlas");
  assert.equal(hint?.title, "TAKTIK ZIELEN");
  assert.equal(hint?.focus, "arena");
});
