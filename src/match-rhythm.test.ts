import assert from "node:assert/strict";
import test from "node:test";
import { Match } from "./engine";
import { matchRhythm } from "./match-rhythm";

test("opening stays visually restrained", () => {
  const match = new Match({ botEnabled: false });
  const rhythm = matchRhythm(match.state);
  assert.equal(rhythm.stage, "opening");
  assert.equal(rhythm.neutralTip, "EROBERE DIE MITTE");
  assert.ok(rhythm.intensity < 0.5);
});

test("time alone transitions the match into battle and pressure", () => {
  const match = new Match({ botEnabled: false });
  match.state.time = 60;
  assert.equal(matchRhythm(match.state).stage, "battle");
  match.state.time = 125;
  assert.equal(matchRhythm(match.state).stage, "pressure");
});

test("critical Core pressure forces climax before the clock does", () => {
  const match = new Match({ botEnabled: false });
  match.state.time = 70;
  match.state.cores.enemy.hp = match.state.cores.enemy.maxHp * 0.25;
  const rhythm = matchRhythm(match.state);
  assert.equal(rhythm.stage, "climax");
  assert.equal(rhythm.neutralTip, "JETZT ENTSCHEIDET DIE FRONT");
  assert.ok(rhythm.intensity >= 0.68);
});

test("active fighting raises intensity without changing the rhythm stage", () => {
  const quiet = new Match({ botEnabled: false });
  quiet.state.time = 70;
  const quietRhythm = matchRhythm(quiet.state);

  const busy = new Match({ botEnabled: false });
  busy.state.time = 70;
  for (let i = 0; i < 3; i++) busy.state.points[i + 3].contested = true;
  for (let i = 0; i < 12; i++)
    busy.state.units.push({
      id: 100 + i,
      cardId: "vanguard",
      team: i % 2 ? "enemy" : "player",
      x: 100 + i,
      y: 250,
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
  const busyRhythm = matchRhythm(busy.state);

  assert.equal(busyRhythm.stage, "battle");
  assert.ok(busyRhythm.intensity > quietRhythm.intensity);
});

test("overtime always uses climax pacing", () => {
  const match = new Match({ botEnabled: false });
  match.state.time = 181;
  match.state.phase = "overtime";
  const rhythm = matchRhythm(match.state);
  assert.equal(rhythm.stage, "climax");
  assert.ok(rhythm.pulseRate > 3);
});

test("malformed time never breaks the pacing model", () => {
  const match = new Match({ botEnabled: false });
  match.state.time = Number.NaN;
  const rhythm = matchRhythm(match.state);
  assert.equal(rhythm.stage, "opening");
  assert.ok(Number.isFinite(rhythm.intensity));
});
