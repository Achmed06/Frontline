import test from "node:test";
import assert from "node:assert/strict";
import { Match, DEFAULT_DECK, type CardId, type Team } from "./engine";
const deck: CardId[] = ["pioneer", ...DEFAULT_DECK.slice(1)];
function scenario(pioneer: boolean, count = 1, team: Team = "player") {
  const m = new Match({ playerDeck: deck, botEnabled: false });
  for (let i = 0; i < count; i++) {
    m.state.energy[team] = 10;
    assert.equal(
      m.play(
        team,
        pioneer ? "pioneer" : "bulwark",
        210,
        team === "player" ? 480 : 80,
      ).ok,
      true,
    );
    Object.assign(m.state.units.at(-1)!, {
      x: 210,
      y: 280,
      speed: 0,
      damage: 0,
    });
  }
  return m;
}
test("Pionier accelerates capture equally for both teams without stacking specialist bonuses", () => {
  for (const team of ["player", "enemy"] as const) {
    for (const count of [1, 2]) {
      const plain = scenario(false, count, team),
        fast = scenario(true, count, team);
      plain.update(1);
      fast.update(1);
      assert.ok(
        Math.abs(
          fast.state.points[4].capture / plain.state.points[4].capture - 1.5,
        ) < 1e-8,
      );
    }
    const fast = scenario(true, 1, team);
    fast.update(2.9);
    assert.equal(fast.state.points[4].owner, team);
  }
});
test("Pionier never bypasses contests, dead units or supply requirements", () => {
  const m = scenario(true);
  m.update(0.5);
  const before = m.state.points[4].capture;
  m.play("enemy", "pioneer", 210, 80);
  Object.assign(m.state.units[1], { x: 210, y: 280, speed: 0, damage: 0 });
  m.update(1);
  assert.equal(m.state.points[4].contested, true);
  assert.equal(m.state.points[4].capture, before);
  m.state.units[1].hp = 0;
  m.state.points[7].owner = "enemy";
  m.update(3);
  assert.equal(m.state.points[4].owner, "player");
  assert.equal(m.state.points[4].supplied, false);
  assert.equal(m.canDeploy("player", 210, 280), false);
});
