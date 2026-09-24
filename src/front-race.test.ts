import assert from "node:assert/strict";
import test from "node:test";
import { frontRace } from "./front-race";

test("front race counts the initial 3-3-3 board correctly", () => {
  const race = frontRace([
    "enemy","enemy","enemy",
    null,null,null,
    "player","player","player",
  ]);
  assert.deepEqual(
    { player: race.player, enemy: race.enemy, neutral: race.neutral, state: race.state },
    { player: 3, enemy: 3, neutral: 3, state: "even" },
  );
  assert.match(race.aria, /ausgeglichen 3 zu 3/i);
});

test("front race exposes player advantage without inventing percentages", () => {
  const race = frontRace([
    "enemy","enemy",null,
    "player","player","player",
    "player",null,"player",
  ]);
  assert.equal(race.player, 5);
  assert.equal(race.enemy, 2);
  assert.equal(race.neutral, 2);
  assert.equal(race.state, "player");
  assert.match(race.aria, /Du führst 5 zu 2/);
});

test("front race mirrors enemy advantage", () => {
  const race = frontRace([
    "enemy","enemy","enemy",
    "enemy",null,"player",
    "player",null,"enemy",
  ]);
  assert.equal(race.state, "enemy");
  assert.match(race.aria, /Gegner führt 5 zu 2/);
});

test("front race stays safe for an empty owner list", () => {
  const race = frontRace([]);
  assert.deepEqual(
    { player: race.player, enemy: race.enemy, neutral: race.neutral, state: race.state },
    { player: 0, enemy: 0, neutral: 0, state: "even" },
  );
});
