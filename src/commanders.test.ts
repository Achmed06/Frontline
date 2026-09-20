import test from "node:test";
import assert from "node:assert/strict";
import { Match, DEFAULT_DECK } from "./engine";
import { newSeries, normalizeSeries, chooseSeriesRoute } from "./series";

test("LYRA heals and cleanses only living allies, never wastes cooldown on a full healthy army", () => {
  const m = new Match({ playerCommander: "lyra", botEnabled: false });
  assert.equal(m.commanders.enemy, "lyra");
  assert.equal(m.activateCommander().ok, false);
  m.play("player", "vanguard", 210, 450);
  m.play("enemy", "vanguard", 210, 110);
  const ally = m.state.units[0],
    enemy = m.state.units[1];
  assert.equal(m.activateCommander().ok, false);
  assert.equal(m.state.commanderCooldown, 0);
  Object.assign(ally, { hp: 30, slowTime: 4, slowFactor: 0.6 });
  enemy.hp = 30;
  m.state.cores.player.hp = 900;
  const energy = m.state.energy.player;
  assert.equal(m.activateCommander().ok, true);
  assert.equal(ally.hp, 110);
  assert.equal(ally.slowTime, 0);
  assert.equal(ally.slowFactor, 1);
  assert.equal(enemy.hp, 30);
  assert.equal(m.state.cores.player.hp, 900);
  assert.equal(m.state.energy.player, energy);
  assert.equal(m.state.commanderCooldown, 35);
  assert.equal(m.activateCommander().ok, false);
  m.state.commanderCooldown = 0;
  assert.equal(m.activateCommander().ok, true);
  assert.equal(ally.hp, 125);
});
test("series retains commander choice and migrates legacy saves to ATLAS", () => {
  const run = chooseSeriesRoute(newSeries(DEFAULT_DECK, "lyra"), "bridgehead");
  assert.equal(run.commander, "lyra");
  assert.deepEqual(normalizeSeries(JSON.parse(JSON.stringify(run))), run);
  const { commander: _id, ...legacy } = run;
  assert.equal(normalizeSeries(legacy)?.commander, "atlas");
  assert.equal(normalizeSeries({ ...run, commander: "fake" }), null);
  assert.equal(new Match().commanders.player, "atlas");
});
