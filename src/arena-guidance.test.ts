import assert from "node:assert/strict";
import test from "node:test";
import { Match } from "./engine";
import { arenaGuidance } from "./arena-guidance";

const objective = { pointIds: [3, 5], requiredPoints: 1, seconds: 45 };

function openingMatch() {
  const match = new Match({ botEnabled: false });
  assert.equal(match.play("player", "vanguard", 210, 470).ok, true);
  assert.equal(match.play("player", "ranger", 210, 470).ok, true);
  return match;
}

function ownSixPoints(match: Match) {
  for (const point of match.state.points.slice(3)) {
    point.owner = "player";
    point.supplied = true;
  }
}

test("control missions keep their relay goal even with six owned points", () => {
  const match = openingMatch();
  ownSixPoints(match);
  assert.equal(arenaGuidance(match.state, objective), "HALTE DIE MARKIERTEN RELAIS");
  assert.equal(arenaGuidance(match.state), "ERREICHE DEN GEGNERISCHEN CORE");
});

test("supply and contest warnings retain priority over mission and opening tips", () => {
  const match = openingMatch();
  match.state.points[3].contested = true;
  match.state.points[6].supplied = false;
  assert.equal(arenaGuidance(match.state, objective), "VERSORGUNG UNTERBROCHEN");
  match.state.points[6].supplied = true;
  assert.equal(arenaGuidance(match.state, objective), "PUNKT UMKÄMPFT");
  match.state.points[3].contested = false;
  assert.equal(arenaGuidance(match.state, objective), "HALTE DIE MARKIERTEN RELAIS");
});

test("early Core pressure ends opening coaching for either team", () => {
  for (const team of ["player", "enemy"] as const) {
    const match = openingMatch();
    assert.equal(arenaGuidance(match.state), "ZWEITE LANE ÖFFNEN");
    const core = match.state.cores[team];
    core.hp = core.maxHp * 0.6;
    assert.equal(arenaGuidance(match.state), "NÄCHSTEN PUNKT SICHERN");
    core.hp = core.maxHp * 0.3;
    assert.equal(arenaGuidance(match.state), "JETZT ENTSCHEIDET DIE FRONT");
  }
});

test("a wiped early army rebuilds before being directed at the enemy Core", () => {
  const match = openingMatch();
  ownSixPoints(match);
  for (const unit of match.state.units) unit.hp = 0;
  assert.equal(arenaGuidance(match.state), "FRONT NEU AUFBAUEN");
});

test("normal battle guidance takes over at exactly thirty-five seconds", () => {
  const match = openingMatch();
  match.state.time = 34.99;
  assert.equal(arenaGuidance(match.state), "ZWEITE LANE ÖFFNEN");
  match.state.time = 35;
  assert.equal(arenaGuidance(match.state), "FRONT WEITER VORSCHIEBEN");
});
