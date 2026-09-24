import assert from "node:assert/strict";
import test from "node:test";
import { Match, TRAINING_CONTROL } from "./engine";
import { timeLimitOutlook } from "./time-limit-outlook";

test("core mode follows engine tiebreak order: core before territory", () => {
  const match = new Match();
  match.state.cores.player.hp = 2200;
  match.state.cores.enemy.hp = 1800;
  match.state.points[3].owner = "enemy";
  match.state.points[4].owner = "enemy";
  const outlook = timeLimitOutlook(match.state, null);
  assert.equal(outlook.leader, "player");
  assert.equal(outlook.reason, "core");
  assert.match(outlook.detail, /CORE/);
});

test("territory decides only when core fractions are tied", () => {
  const match = new Match();
  match.state.points[3].owner = "player";
  match.state.points[4].owner = "player";
  const outlook = timeLimitOutlook(match.state, null);
  assert.equal(outlook.leader, "player");
  assert.equal(outlook.reason, "territory");
  assert.equal(outlook.detail, "GEBIET 5 : 3");
});

test("control mode prioritizes control time over core and territory", () => {
  const match = new Match({ controlObjective: TRAINING_CONTROL });
  match.state.controlTime.player = 12;
  match.state.controlTime.enemy = 18;
  match.state.cores.player.hp = 2300;
  match.state.cores.enemy.hp = 500;
  const outlook = timeLimitOutlook(match.state, TRAINING_CONTROL);
  assert.equal(outlook.leader, "enemy");
  assert.equal(outlook.reason, "control");
  assert.equal(outlook.detail, "KONTROLLZEIT 12s : 18s");
});

test("exact ties remain neutral", () => {
  const match = new Match();
  for (const point of match.state.points) point.owner = null;
  const outlook = timeLimitOutlook(match.state, null);
  assert.equal(outlook.leader, "draw");
  assert.equal(outlook.reason, "draw");
  assert.equal(outlook.label, "GLEICHSTAND");
});

test("control ties correctly fall through to core then territory", () => {
  const match = new Match({ controlObjective: TRAINING_CONTROL });
  match.state.controlTime.player = 10;
  match.state.controlTime.enemy = 10;
  match.state.cores.player.hp = 1000;
  match.state.cores.enemy.hp = 1000;
  match.state.points[3].owner = "player";
  const outlook = timeLimitOutlook(match.state, TRAINING_CONTROL);
  assert.equal(outlook.reason, "territory");
  assert.equal(outlook.leader, "player");
});
