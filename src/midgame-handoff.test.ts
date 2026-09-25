import assert from "node:assert/strict";
import test from "node:test";
import { Match } from "./engine";
import { midgameHandoff } from "./midgame-handoff";

test("handoff stays out of the first two decisions and leaves after opening", () => {
  const match = new Match({ botEnabled: false });
  assert.equal(midgameHandoff(match.state, 0), null);
  assert.equal(midgameHandoff(match.state, 1), null);

  assert.equal(match.play("player", "vanguard", 210, 470).ok, true);
  assert.equal(match.play("player", "ranger", 210, 470).ok, true);
  assert.ok(midgameHandoff(match.state, 2));

  match.state.time = 35.01;
  assert.equal(midgameHandoff(match.state, 2), null);
});

test("a wiped opening asks for a rebuild before broader strategy", () => {
  const match = new Match({ botEnabled: false });
  assert.equal(match.play("player", "vanguard", 210, 470).ok, true);
  assert.equal(match.play("player", "ranger", 210, 470).ok, true);
  for (const unit of match.state.units) unit.hp = 0;

  assert.deepEqual(midgameHandoff(match.state, 2), {
    kind: "rebuild",
    tip: "FRONT NEU AUFBAUEN",
  });
});

test("single-lane openings hand off toward a second lane while neutral ground remains", () => {
  const match = new Match({ botEnabled: false });
  assert.equal(match.play("player", "vanguard", 210, 470).ok, true);
  assert.equal(match.play("player", "ranger", 210, 470).ok, true);

  assert.deepEqual(midgameHandoff(match.state, 2), {
    kind: "split",
    tip: "ZWEITE LANE ÖFFNEN",
  });
});

test("enemy point lead takes priority over lane splitting", () => {
  const match = new Match({ botEnabled: false });
  assert.equal(match.play("player", "vanguard", 210, 470).ok, true);
  assert.equal(match.play("player", "ranger", 210, 470).ok, true);
  match.state.points[3].owner = "enemy";

  assert.deepEqual(midgameHandoff(match.state, 2), {
    kind: "stabilize",
    tip: "FRONT STABILISIEREN",
  });
});

test("spread pressure with a lead asks the player to expand", () => {
  const match = new Match({ botEnabled: false });
  assert.equal(match.play("player", "vanguard", 85, 470).ok, true);
  assert.equal(match.play("player", "ranger", 335, 470).ok, true);
  match.state.points[3].owner = "player";

  assert.deepEqual(midgameHandoff(match.state, 2), {
    kind: "expand",
    tip: "VORSPRUNG AUSBAUEN",
  });
});

test("even spread fronts fall through to the next neutral objective", () => {
  const match = new Match({ botEnabled: false });
  assert.equal(match.play("player", "vanguard", 85, 470).ok, true);
  assert.equal(match.play("player", "ranger", 335, 470).ok, true);

  assert.deepEqual(midgameHandoff(match.state, 2), {
    kind: "advance",
    tip: "NÄCHSTEN PUNKT SICHERN",
  });
});

test("malformed time fails closed", () => {
  const match = new Match({ botEnabled: false });
  match.state.time = Number.NaN;
  assert.equal(midgameHandoff(match.state, 2), null);
});
