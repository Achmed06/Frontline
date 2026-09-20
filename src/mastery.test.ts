import test from "node:test";
import assert from "node:assert/strict";
import { Match } from "./engine";
import { advanceMastery, masteryRank, normalizeMastery } from "./mastery";
test("mastery counts valid player card plays, not swarm members, and awards only completed matches", () => {
  const m = new Match({ botEnabled: false });
  const empty = normalizeMastery(null);
  assert.equal(m.play("player", "swarm", -100, -100).ok, false);
  assert.equal(m.state.stats.unitPlays.swarm, undefined);
  for (let i = 0; i < 3; i++) {
    m.state.energy.player = 10;
    assert.equal(m.play("player", "swarm", 210, 480).ok, true);
  }
  assert.equal(m.state.stats.unitPlays.swarm, 3);
  assert.ok(m.state.stats.deployed > 3);
  m.state.energy.enemy = 10;
  assert.equal(m.play("enemy", "swarm", 210, 80).ok, true);
  assert.equal(m.state.stats.unitPlays.swarm, 3);
  assert.equal(advanceMastery(empty, m.state, "a"), empty);
  m.state.phase = "ended";
  m.state.winner = "enemy";
  const first = advanceMastery(empty, m.state, "a");
  assert.equal(first.units.swarm, 1);
  assert.equal(first.units.vanguard, undefined);
  assert.equal(masteryRank(first.units.swarm!).frame, "bronze");
  assert.equal(advanceMastery(first, m.state, "a"), first);
  assert.deepEqual(normalizeMastery(JSON.parse(JSON.stringify(first))), first);
  const capped = normalizeMastery({
    units: { swarm: 100, ranger: -1, pulse: 15 },
  });
  assert.deepEqual(capped.units, { swarm: 15 });
  assert.equal(masteryRank(5).frame, "silver");
  assert.equal(masteryRank(15).frame, "gold");
});
